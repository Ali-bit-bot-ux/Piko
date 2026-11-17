import type { PrismaClient } from "@/generated/prisma/client";
import { isStaff, type SessionUser } from "../auth/policy";
import { groupRatings } from "../evaluations/score-criterion";
import {
  bestAttempt,
  calculateScore,
  profiles,
  type ScoreResult,
} from "../scoring";
import { trialTypes, isTimedTrial } from "../trials/record-measurement";
import { getPrisma } from "./client";
import { findIntakeForUser } from "./intakes";

/** Intake statuses in which coaches may still rate. */
const RATING_STATUSES = ["open", "testing"];

/**
 * Everything the result page of one child shows. Null when the user is not
 * staff of the intake's academy or the child is not in that intake (looks
 * like a missing page).
 */
export async function getCandidateResultForUser(
  user: Pick<SessionUser, "id" | "role" | "organizationId">,
  intakeId: string,
  candidateId: string,
  prisma: PrismaClient = getPrisma(),
) {
  if (!isStaff(user)) return null;
  const intake = await findIntakeForUser(user, intakeId, prisma);
  if (!intake) return null;

  const candidate = await prisma.candidate.findFirst({
    where: { id: candidateId, intakeId: intake.id },
    select: {
      id: true,
      fullName: true,
      birthDate: true,
      parentName: true,
      parentContact: true,
      status: true,
      measurements: {
        orderBy: { attempt: "asc" },
        select: {
          attempt: true,
          value: true,
          trial: { select: { type: true } },
        },
      },
      evaluations: {
        select: { criterionKey: true, score: true, coachId: true },
      },
    },
  });
  if (!candidate) return null;

  const trials = trialTypes
    .map((type) => {
      const attempts = candidate.measurements
        .filter((m) => m.trial.type === type)
        .map((m) => ({ attempt: m.attempt, value: m.value }));
      return {
        type,
        timed: isTimedTrial(type),
        attempts,
        best: bestAttempt(
          type,
          attempts.map((a) => a.value),
        ),
      };
    })
    .filter((trial) => trial.attempts.length > 0);

  const ratings = groupRatings(candidate.evaluations);
  const criteria = profiles[intake.ageProfile].map(({ key, weight }) => ({
    key,
    weight,
    mine:
      candidate.evaluations.find(
        (e) => e.criterionKey === key && e.coachId === user.id,
      )?.score ?? null,
    ratings: [...(ratings[key] ?? [])].sort((a, b) => a - b),
  }));

  const score: ScoreResult | null = calculateScore(intake.ageProfile, ratings);

  return {
    intake: {
      id: intake.id,
      name: intake.name,
      status: intake.status,
      ageProfile: intake.ageProfile,
    },
    candidate: {
      id: candidate.id,
      fullName: candidate.fullName,
      birthDate: candidate.birthDate,
      parentName: candidate.parentName,
      parentContact: candidate.parentContact,
      status: candidate.status,
    },
    trials,
    criteria,
    score,
    canScore: RATING_STATUSES.includes(intake.status),
  };
}
