import { z } from "zod";
import type { PrismaClient } from "@/generated/prisma/client";
import { canManageIntakes, type SessionUser } from "../auth/policy";
import { getPrisma } from "../db/client";
import { findIntakeForUser } from "../db/intakes";
import { generateReportToken, hashReportToken, reportExpiry } from "./token";

export const reportTargetSchema = z.object({
  intakeId: z.uuid(),
  candidateId: z.uuid(),
});

export type ReportTarget = z.input<typeof reportTargetSchema>;

export type ReportUser = Pick<SessionUser, "id" | "role" | "organizationId">;

export type CreateReportResult =
  | { ok: true; token: string; expiresAt: Date }
  | { ok: false; code: "invalid" | "forbidden" | "not_found" | "no_score" };

/**
 * Issues a public report link for one child. Only admin and director of the
 * intake's academy, and only once the child has a total. Calling it again
 * issues a new token and invalidates the old one (the row is replaced, the
 * "sent" and "opened" marks start over). The token is returned once and is
 * never stored: only its hash is.
 */
export async function createReport(
  user: ReportUser,
  input: unknown,
  client?: PrismaClient,
  now: Date = new Date(),
): Promise<CreateReportResult> {
  if (!canManageIntakes(user) || user.organizationId === null) {
    return { ok: false, code: "forbidden" };
  }
  const parsed = reportTargetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };
  const { intakeId, candidateId } = parsed.data;

  const prisma = client ?? getPrisma();
  // Another academy's intake looks exactly like a missing one.
  const intake = await findIntakeForUser(user, intakeId, prisma);
  if (!intake) return { ok: false, code: "not_found" };

  const candidate = await prisma.candidate.findFirst({
    where: { id: candidateId, intakeId: intake.id },
    select: { id: true, score: { select: { decision: true } } },
  });
  if (!candidate) return { ok: false, code: "not_found" };
  if (!candidate.score) return { ok: false, code: "no_score" };

  const token = generateReportToken();
  const expiresAt = reportExpiry(now);
  const fields = {
    tokenHash: hashReportToken(token),
    expiresAt,
    // Snapshot of the status when the link was issued; the page itself
    // always shows the current total.
    summary: candidate.score.decision,
    sentAt: null,
    openedAt: null,
    createdAt: now,
  };
  await prisma.report.upsert({
    where: { candidateId: candidate.id },
    create: { candidateId: candidate.id, ...fields },
    update: fields,
  });
  return { ok: true, token, expiresAt };
}
