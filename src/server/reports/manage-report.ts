import { z } from "zod";
import type { PrismaClient } from "@/generated/prisma/client";
import { canManageIntakes } from "../auth/policy";
import { getPrisma } from "../db/client";
import { findIntakeForUser } from "../db/intakes";
import { recordEvent } from "../events";
import { reportTargetSchema, type ReportUser } from "./create-report";
import { isReportExpired } from "./token";

export type ReportPanelData = {
  /** The child has a total, so a link can be issued. */
  canCreate: boolean;
  report: {
    createdAt: Date;
    expiresAt: Date;
    expired: boolean;
    sentAt: Date | null;
    openedAt: Date | null;
  } | null;
};

/**
 * What the "report for the parent" panel shows. Null when the user may not
 * manage reports of this child (not admin/director, another academy, no such
 * child), which the page treats as "show nothing".
 */
export async function getReportPanelForUser(
  user: ReportUser,
  input: unknown,
  client?: PrismaClient,
  now: Date = new Date(),
): Promise<ReportPanelData | null> {
  if (!canManageIntakes(user) || user.organizationId === null) return null;
  const parsed = reportTargetSchema.safeParse(input);
  if (!parsed.success) return null;
  const prisma = client ?? getPrisma();

  const intake = await findIntakeForUser(user, parsed.data.intakeId, prisma);
  if (!intake) return null;
  const candidate = await prisma.candidate.findFirst({
    where: { id: parsed.data.candidateId, intakeId: intake.id },
    select: {
      score: { select: { id: true } },
      report: {
        select: {
          createdAt: true,
          expiresAt: true,
          sentAt: true,
          openedAt: true,
        },
      },
    },
  });
  if (!candidate) return null;

  return {
    canCreate: candidate.score !== null,
    report: candidate.report
      ? {
          ...candidate.report,
          expired: isReportExpired(candidate.report.expiresAt, now),
        }
      : null,
  };
}

export const sendChannels = ["whatsapp", "email", "manual"] as const;
export type SendChannel = (typeof sendChannels)[number];

const markSentSchema = reportTargetSchema.extend({
  channel: z.enum(sendChannels),
});

export type MarkSentResult =
  | { ok: true; alreadySent: boolean }
  | { ok: false; code: "invalid" | "forbidden" | "not_found" };

/**
 * The admin says the link was sent to the parent (the app sends nothing
 * itself). Sets `sentAt` on the first call and writes `report_sent`; later
 * calls change nothing.
 */
export async function markReportSent(
  user: ReportUser,
  input: unknown,
  client?: PrismaClient,
  now: Date = new Date(),
): Promise<MarkSentResult> {
  if (!canManageIntakes(user) || user.organizationId === null) {
    return { ok: false, code: "forbidden" };
  }
  const parsed = markSentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };
  const { intakeId, candidateId, channel } = parsed.data;
  const prisma = client ?? getPrisma();

  const intake = await findIntakeForUser(user, intakeId, prisma);
  if (!intake) return { ok: false, code: "not_found" };
  const report = await prisma.report.findFirst({
    where: { candidateId, candidate: { intakeId: intake.id } },
    select: { id: true },
  });
  if (!report) return { ok: false, code: "not_found" };

  // One transaction: the mark and its journal event stand or fall together.
  const alreadySent = await prisma.$transaction(async (tx) => {
    const marked = await tx.report.updateMany({
      where: { id: report.id, sentAt: null },
      data: { sentAt: now },
    });
    if (marked.count === 0) return true;

    await recordEvent(
      {
        id: crypto.randomUUID(),
        type: "report_sent",
        organizationId: intake.organizationId,
        intakeId: intake.id,
        participantId: candidateId,
        actorId: user.id,
        actorRole: user.role,
        source: "web",
        occurredAtDevice: now,
        payload: { reportId: report.id, channel },
      },
      tx,
    );
    return false;
  });
  if (alreadySent) return { ok: true, alreadySent: true };
  return { ok: true, alreadySent: false };
}
