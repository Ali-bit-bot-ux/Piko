import { z } from "zod";
import type { PrismaClient, Prisma } from "@/generated/prisma/client";
import { isStaff, type SessionUser } from "../auth/policy";
import { getPrisma } from "./client";
import { findIntakeForUser } from "./intakes";

export const candidateStatuses = [
  "registered",
  "checked_in",
  "evaluated",
  "decided",
] as const;

/** Filters from the address bar. Anything invalid is ignored, never an error. */
export function parseCandidateFilters(input: {
  q?: unknown;
  status?: unknown;
}): { q?: string; status?: (typeof candidateStatuses)[number] } {
  const q = z.string().trim().min(1).max(100).safeParse(input.q);
  const status = z.enum(candidateStatuses).safeParse(input.status);
  return {
    q: q.success ? q.data : undefined,
    status: status.success ? status.data : undefined,
  };
}

export type CandidateFilters = ReturnType<typeof parseCandidateFilters>;

/** Makes "%", "_" and "\" ordinary characters in a LIKE/ILIKE search. */
export function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, "\\$&");
}

/**
 * Children registered in an intake of the user's own academy, newest first.
 * Returns null when the intake is not theirs (looks like a missing one).
 * `total` ignores the filters, so the page can say "found N of M".
 */
export async function listCandidatesForUser(
  user: Pick<SessionUser, "role" | "organizationId">,
  intakeId: string,
  filters: CandidateFilters = {},
  prisma: PrismaClient = getPrisma(),
) {
  if (!isStaff(user)) return null;
  const intake = await findIntakeForUser(user, intakeId, prisma);
  if (!intake) return null;

  const where: Prisma.CandidateWhereInput = {
    intakeId: intake.id,
    ...(filters.q
      ? {
          fullName: { contains: escapeLike(filters.q), mode: "insensitive" },
        }
      : {}),
    ...(filters.status ? { status: filters.status } : {}),
  };

  const [total, items] = await Promise.all([
    prisma.candidate.count({ where: { intakeId: intake.id } }),
    prisma.candidate.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      select: {
        id: true,
        fullName: true,
        birthDate: true,
        parentName: true,
        parentContact: true,
        status: true,
        createdAt: true,
      },
    }),
  ]);
  return { total, items };
}
