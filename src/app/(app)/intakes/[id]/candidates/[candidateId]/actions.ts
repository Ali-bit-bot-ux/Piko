"use server";

import { revalidatePath } from "next/cache";
import { candidatePath } from "@/lib/routes";
import { requireStaff } from "@/server/auth/session";
import {
  scoreCriterion,
  type ScoreCriterionInput,
  type ScoreCriterionResult,
} from "@/server/evaluations/score-criterion";
import { logFailure } from "@/server/log";

export type RatingInput = Omit<ScoreCriterionInput, "intakeId" | "candidateId">;

/**
 * Saves the coach's rating of one criterion. The page binds the first two
 * arguments, so the client sends only the rating. Re-checks the session.
 */
export async function scoreCriterionAction(
  intakeId: string,
  candidateId: string,
  rating: RatingInput,
): Promise<ScoreCriterionResult | { ok: false; code: "generic" }> {
  const user = await requireStaff();
  try {
    const result = await scoreCriterion(user, {
      ...rating,
      intakeId,
      candidateId,
    });
    if (result.ok) {
      // Total, status and the ring on the page come from the database.
      revalidatePath(candidatePath(intakeId, candidateId));
    }
    return result;
  } catch (error) {
    logFailure("saving an evaluation failed", error);
    return { ok: false, code: "generic" };
  }
}
