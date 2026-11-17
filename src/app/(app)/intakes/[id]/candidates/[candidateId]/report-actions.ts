"use server";

import { revalidatePath } from "next/cache";
import { candidatePath, reportPath } from "@/lib/routes";
import { requireStaff } from "@/server/auth/session";
import { loadConfig } from "@/server/config";
import {
  createReport,
  markReportSent,
  type SendChannel,
} from "@/server/reports";

export type CreateLinkResult =
  | { ok: true; url: string }
  | {
      ok: false;
      code: "invalid" | "forbidden" | "not_found" | "no_score" | "generic";
    };

export type MarkSentActionResult =
  | { ok: true }
  | { ok: false; code: "invalid" | "forbidden" | "not_found" | "generic" };

/**
 * Issues a new report link. The token is part of the returned address only
 * once: it is not stored or logged. Re-checks the session and the academy.
 */
export async function createReportLinkAction(
  intakeId: string,
  candidateId: string,
): Promise<CreateLinkResult> {
  const user = await requireStaff();
  try {
    const result = await createReport(user, { intakeId, candidateId });
    if (!result.ok) return result;
    revalidatePath(candidatePath(intakeId, candidateId));
    return {
      ok: true,
      url: `${loadConfig().appUrl}${reportPath(result.token)}`,
    };
  } catch (error) {
    console.error("creating a report link failed", error);
    return { ok: false, code: "generic" };
  }
}

/** The admin confirms the link was sent to the parent. */
export async function markReportSentAction(
  intakeId: string,
  candidateId: string,
  channel: SendChannel,
): Promise<MarkSentActionResult> {
  const user = await requireStaff();
  try {
    const result = await markReportSent(user, {
      intakeId,
      candidateId,
      channel,
    });
    if (!result.ok) return result;
    revalidatePath(candidatePath(intakeId, candidateId));
    return { ok: true };
  } catch (error) {
    console.error("marking a report as sent failed", error);
    return { ok: false, code: "generic" };
  }
}
