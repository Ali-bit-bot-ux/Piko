import { z } from "zod";
import type { PrismaClient } from "@/generated/prisma/client";
import {
  canAccessOrganization,
  isStaff,
  type SessionUser,
} from "../auth/policy";
import { getPrisma } from "./client";

/**
 * Returns the intake only when it belongs to the user's academy. Another
 * academy's intake looks exactly like a missing one (no information leak).
 */
export async function findIntakeForUser(
  user: Pick<SessionUser, "organizationId">,
  intakeId: string,
  prisma: PrismaClient = getPrisma(),
) {
  // A malformed id is "not found", not a database error.
  if (!z.uuid().safeParse(intakeId).success) return null;
  const intake = await prisma.intake.findUnique({ where: { id: intakeId } });
  if (!intake || !canAccessOrganization(user, intake.organizationId)) {
    return null;
  }
  return intake;
}

/** Intakes of the user's own academy, newest first. Empty for non-staff. */
export async function listIntakesForUser(
  user: Pick<SessionUser, "role" | "organizationId">,
  prisma: PrismaClient = getPrisma(),
) {
  if (!isStaff(user) || user.organizationId === null) return [];
  return prisma.intake.findMany({
    where: { organizationId: user.organizationId },
    orderBy: [{ tryoutDate: "desc" }, { createdAt: "desc" }],
    include: { _count: { select: { candidates: true } } },
  });
}
