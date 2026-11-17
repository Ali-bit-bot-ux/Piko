import type { PrismaClient } from "@/generated/prisma/client";
import { isStaff, type SessionUser } from "../auth/policy";
import { getPrisma } from "./client";
import { findIntakeForUser } from "./intakes";

export type CandidateAttempts = {
  candidateId: string;
  fullName: string;
  /** Saved results, in attempt order. */
  attempts: { attempt: number; value: number }[];
};

/**
 * Every child of the intake with the attempts already saved for one test.
 * Null when the intake is not the user's (looks like a missing one).
 */
export async function listTrialProgress(
  user: Pick<SessionUser, "role" | "organizationId">,
  intakeId: string,
  trialType: "sprint_20m" | "shuttle_5_10_5" | "dribbling",
  prisma: PrismaClient = getPrisma(),
): Promise<CandidateAttempts[] | null> {
  if (!isStaff(user)) return null;
  const intake = await findIntakeForUser(user, intakeId, prisma);
  if (!intake) return null;

  const candidates = await prisma.candidate.findMany({
    where: { intakeId: intake.id },
    orderBy: [{ fullName: "asc" }, { id: "asc" }],
    select: {
      id: true,
      fullName: true,
      measurements: {
        where: { trial: { type: trialType } },
        orderBy: { attempt: "asc" },
        select: { attempt: true, value: true },
      },
    },
  });

  return candidates.map((candidate) => ({
    candidateId: candidate.id,
    fullName: candidate.fullName,
    attempts: candidate.measurements,
  }));
}
