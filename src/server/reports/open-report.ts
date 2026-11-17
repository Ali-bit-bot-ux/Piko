import { z } from "zod";
import type { PrismaClient } from "@/generated/prisma/client";
import type { Decision } from "@/generated/prisma/enums";
import { getPrisma } from "../db/client";
import { recordEvent } from "../events";
import { profiles } from "../scoring";
import { pickHighlights } from "./phrases";
import { hashReportToken, isReportExpired, isReportTokenShape } from "./token";

const breakdownSchema = z.object({
  criteria: z.array(z.object({ key: z.string(), score: z.number() })),
});

export type PublicReport = {
  childName: string;
  academyName: string;
  total: number;
  decision: Decision;
  /** Criteria of the age profile with the median score, in profile order. */
  criteria: { key: string; score: number }[];
  strengths: string[];
  growth: string[];
  expiresAt: Date;
};

/** One answer for every bad link: wrong, expired or replaced. */
export type OpenReportResult =
  { ok: true; report: PublicReport } | { ok: false };

/**
 * Reads the report behind a link token. A wrong, replaced or expired link
 * gives the same `{ ok: false }` (nothing says which). The first successful
 * open sets `openedAt` and writes `report_opened` (pseudonymous ids only).
 */
export async function openReport(
  token: string,
  client?: PrismaClient,
  now: Date = new Date(),
): Promise<OpenReportResult> {
  if (!isReportTokenShape(token)) return { ok: false };
  const prisma = client ?? getPrisma();

  const row = await prisma.report.findUnique({
    where: { tokenHash: hashReportToken(token) },
    select: {
      id: true,
      expiresAt: true,
      candidate: {
        select: {
          id: true,
          fullName: true,
          intake: {
            select: {
              id: true,
              organizationId: true,
              ageProfile: true,
              organization: { select: { name: true } },
            },
          },
          score: { select: { total: true, decision: true, breakdown: true } },
        },
      },
    },
  });
  if (!row || isReportExpired(row.expiresAt, now)) return { ok: false };

  const { candidate } = row;
  const breakdown = breakdownSchema.safeParse(candidate.score?.breakdown);
  if (!candidate.score || !breakdown.success) return { ok: false };

  // First open only; the condition makes two simultaneous opens write once.
  const marked = await prisma.report.updateMany({
    where: { id: row.id, openedAt: null },
    data: { openedAt: now },
  });
  if (marked.count === 1) {
    await recordEvent(
      {
        id: crypto.randomUUID(),
        type: "report_opened",
        actorRole: "parent",
        organizationId: candidate.intake.organizationId,
        intakeId: candidate.intake.id,
        participantId: candidate.id,
        source: "web",
        occurredAtDevice: now,
        payload: { reportId: row.id },
      },
      prisma,
    );
  }

  const byKey = new Map(breakdown.data.criteria.map((c) => [c.key, c.score]));
  const criteria = profiles[candidate.intake.ageProfile].flatMap(({ key }) => {
    const score = byKey.get(key);
    return score === undefined ? [] : [{ key, score }];
  });

  return {
    ok: true,
    report: {
      childName: candidate.fullName,
      academyName: candidate.intake.organization.name,
      total: Number(candidate.score.total),
      decision: candidate.score.decision,
      criteria,
      ...pickHighlights(criteria),
      expiresAt: row.expiresAt,
    },
  };
}
