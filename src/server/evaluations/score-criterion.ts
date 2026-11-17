import { z } from "zod";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { isStaff, type SessionUser } from "../auth/policy";
import { getPrisma } from "../db/client";
import { findIntakeForUser } from "../db/intakes";
import { recordEvent } from "../events";
import {
  calculateScore,
  criterionKeys,
  SCALE_MAX,
  SCALE_MIN,
  type AgeProfileKey,
  type RatingsByCriterion,
  type ScoreResult,
} from "../scoring";

export const scoreCriterionSchema = z.object({
  intakeId: z.uuid(),
  candidateId: z.uuid(),
  /** Checked against the profile of the intake once it is loaded. */
  criterionKey: z.string().min(1).max(64),
  score: z.number().int().min(SCALE_MIN).max(SCALE_MAX),
  /** Chosen by the sender; a retry with the same id changes nothing. */
  clientEventId: z.uuid(),
  occurredAtDevice: z.coerce.date().optional(),
});

export type ScoreCriterionInput = z.input<typeof scoreCriterionSchema>;

export type ScoreCriterionResult =
  | {
      ok: true;
      duplicate: boolean;
      /** Every criterion of the profile has a rating: the total exists. */
      complete: boolean;
    }
  | { ok: false; code: "invalid" | "forbidden" | "not_found" | "closed" };

/** Groups saved evaluations by criterion (one rating per coach). */
export function groupRatings(
  evaluations: readonly { criterionKey: string; score: number }[],
): RatingsByCriterion {
  const grouped: Record<string, number[]> = {};
  for (const { criterionKey, score } of evaluations) {
    (grouped[criterionKey] ??= []).push(score);
  }
  return grouped;
}

/** What is stored in Score.breakdown: enough to explain the total. */
export function scoreBreakdown(result: ScoreResult): Prisma.InputJsonObject {
  return {
    criteria: result.criteria.map((c) => ({
      key: c.key,
      weight: c.weight,
      score: c.score,
      ratings: c.ratings,
    })),
    strongDisagreement: result.strongDisagreement,
    hasLowCriterion: result.hasLowCriterion,
  };
}

/**
 * Saves the calling coach's rating of one criterion (one rating per coach and
 * criterion, changing it replaces the old one). Then recomputes the total from
 * the medians of all coaches: when every criterion of the profile is rated, the
 * Score row is written and the child becomes "evaluated". Only staff of the
 * intake's own academy, while the intake is open or testing.
 */
export async function scoreCriterion(
  user: Pick<SessionUser, "id" | "role" | "organizationId">,
  input: unknown,
  client?: PrismaClient,
): Promise<ScoreCriterionResult> {
  if (!isStaff(user) || user.organizationId === null) {
    return { ok: false, code: "forbidden" };
  }
  const organizationId = user.organizationId;

  const parsed = scoreCriterionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };
  const data = parsed.data;

  const prisma = client ?? getPrisma();

  // Another academy's intake looks exactly like a missing one.
  const intake = await findIntakeForUser(user, data.intakeId, prisma);
  if (!intake) return { ok: false, code: "not_found" };
  if (intake.status !== "open" && intake.status !== "testing") {
    return { ok: false, code: "closed" };
  }
  const profile: AgeProfileKey = intake.ageProfile;
  if (!criterionKeys(profile).includes(data.criterionKey)) {
    return { ok: false, code: "invalid" };
  }

  return prisma.$transaction(async (tx) => {
    // Serializes coaches rating the same child, so the total never misses a
    // rating that was saved at the same moment.
    const locked = await tx.$queryRaw<{ status: string }[]>`
      SELECT "status"::text AS "status" FROM "candidates"
      WHERE "id" = ${data.candidateId}::uuid AND "intakeId" = ${intake.id}::uuid
      FOR UPDATE`;
    if (locked.length === 0) return { ok: false, code: "not_found" } as const;

    const existing = await tx.evaluation.findUnique({
      where: {
        candidateId_criterionKey_coachId: {
          candidateId: data.candidateId,
          criterionKey: data.criterionKey,
          coachId: user.id,
        },
      },
      select: { score: true },
    });

    const retried = await tx.event.findUnique({
      where: { id: data.clientEventId },
      select: { id: true },
    });

    let duplicate = retried !== null;
    if (!duplicate && existing?.score !== data.score) {
      await tx.evaluation.upsert({
        where: {
          candidateId_criterionKey_coachId: {
            candidateId: data.candidateId,
            criterionKey: data.criterionKey,
            coachId: user.id,
          },
        },
        create: {
          candidateId: data.candidateId,
          criterionKey: data.criterionKey,
          coachId: user.id,
          score: data.score,
        },
        update: { score: data.score },
      });

      // Pseudonymous ids and numbers only: no names or contacts.
      await recordEvent(
        {
          id: data.clientEventId,
          type: "evaluation_scored",
          organizationId,
          intakeId: intake.id,
          participantId: data.candidateId,
          actorId: user.id,
          actorRole: user.role,
          source: "web",
          occurredAtDevice: data.occurredAtDevice ?? new Date(),
          payload: {
            criterionKey: data.criterionKey,
            score: data.score,
            previousScore: existing?.score ?? null,
          },
        },
        tx,
      );
    } else if (!duplicate) {
      // Same rating again with a new id: nothing to change or journal.
      duplicate = true;
    }

    const evaluations = await tx.evaluation.findMany({
      where: { candidateId: data.candidateId },
      select: { criterionKey: true, score: true },
    });
    const result = calculateScore(profile, groupRatings(evaluations));
    if (!result) return { ok: true, duplicate, complete: false } as const;

    const fields = {
      total: result.total,
      breakdown: scoreBreakdown(result),
      decision: result.decision,
    };
    await tx.score.upsert({
      where: { candidateId: data.candidateId },
      create: { candidateId: data.candidateId, ...fields },
      update: fields,
    });
    // "decided" is set by the director later and stays.
    await tx.candidate.updateMany({
      where: {
        id: data.candidateId,
        status: { in: ["registered", "checked_in"] },
      },
      data: { status: "evaluated" },
    });
    return { ok: true, duplicate, complete: true } as const;
  });
}
