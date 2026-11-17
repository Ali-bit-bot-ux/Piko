import type { PrismaClient } from "@/generated/prisma/client";
import { analysisResultSchema, type AnalysisResult } from "../analysis/types";
import { isStaff, type SessionUser } from "../auth/policy";
import { getPrisma } from "./client";
import { findIntakeForUser } from "./intakes";

export type StoredAnalysis = {
  id: string;
  provider: string;
  createdAt: Date;
  result: AnalysisResult;
};

/**
 * The newest saved video analysis of one child, or null (no analysis, not
 * staff of the academy, child not in the intake, or stored JSON no longer
 * matches the schema: it is never shown as is).
 */
export async function getLatestAnalysisForUser(
  user: Pick<SessionUser, "role" | "organizationId">,
  intakeId: string,
  candidateId: string,
  prisma: PrismaClient = getPrisma(),
): Promise<StoredAnalysis | null> {
  if (!isStaff(user)) return null;
  const intake = await findIntakeForUser(user, intakeId, prisma);
  if (!intake) return null;

  const row = await prisma.analysis.findFirst({
    where: { candidateId, source: "video", candidate: { intakeId: intake.id } },
    orderBy: { createdAt: "desc" },
    select: { id: true, provider: true, createdAt: true, result: true },
  });
  if (!row) return null;
  const parsed = analysisResultSchema.safeParse(row.result);
  if (!parsed.success) return null;
  return {
    id: row.id,
    provider: row.provider,
    createdAt: row.createdAt,
    result: parsed.data,
  };
}
