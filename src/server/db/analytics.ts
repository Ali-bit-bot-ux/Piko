import type { PrismaClient } from "@/generated/prisma/client";
import { canManageIntakes, type SessionUser } from "../auth/policy";
import {
  summarizeIntake,
  sumMetrics,
  type CandidateRow,
} from "../analytics/summarize";
import { getPrisma } from "./client";

function hasStrongDisagreement(breakdown: unknown): boolean {
  return (
    typeof breakdown === "object" &&
    breakdown !== null &&
    "strongDisagreement" in breakdown &&
    breakdown.strongDisagreement === true
  );
}

/**
 * Usage and quality numbers of the user's own academy, per intake and in
 * total. Only directors and admins; null for everyone else.
 */
export async function getAnalyticsForUser(
  user: Pick<SessionUser, "role" | "organizationId">,
  prisma: PrismaClient = getPrisma(),
) {
  if (!canManageIntakes(user) || user.organizationId === null) return null;

  const intakes = await prisma.intake.findMany({
    where: { organizationId: user.organizationId },
    orderBy: [{ tryoutDate: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      ageProfile: true,
      tryoutDate: true,
      status: true,
    },
  });

  const candidates = await prisma.candidate.findMany({
    where: { intake: { organizationId: user.organizationId } },
    select: {
      intakeId: true,
      _count: { select: { measurements: true, evaluations: true } },
      score: { select: { total: true, decision: true, breakdown: true } },
      report: { select: { sentAt: true, openedAt: true } },
      analyses: { select: { inputTokens: true, outputTokens: true } },
    },
  });

  const rows: CandidateRow[] = candidates.map((c) => ({
    intakeId: c.intakeId,
    measurementCount: c._count.measurements,
    ratingCount: c._count.evaluations,
    score: c.score
      ? {
          total: Number(c.score.total),
          decision: c.score.decision,
          strongDisagreement: hasStrongDisagreement(c.score.breakdown),
        }
      : null,
    report: c.report
      ? { sent: c.report.sentAt !== null, opened: c.report.openedAt !== null }
      : null,
    analyses: c.analyses,
  }));

  const perIntake = intakes.map((intake) => ({
    intake,
    metrics: summarizeIntake(intake.id, rows),
  }));
  return {
    perIntake,
    total: sumMetrics(perIntake.map((item) => item.metrics)),
  };
}
