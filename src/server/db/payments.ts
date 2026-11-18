import type { PrismaClient } from "@/generated/prisma/client";
import { canManageIntakes, type SessionUser } from "../auth/policy";
import { getPrisma } from "./client";

/**
 * Bills of the user's own academy, newest first. Only directors and admins;
 * null for everyone else (the page then shows "not found").
 */
export async function listPaymentsForUser(
  user: Pick<SessionUser, "role" | "organizationId">,
  prisma: PrismaClient = getPrisma(),
) {
  if (!canManageIntakes(user) || user.organizationId === null) return null;
  const [organization, payments] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { name: true, plan: true },
    }),
    prisma.payment.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        amountKzt: true,
        description: true,
        reference: true,
        status: true,
        createdAt: true,
        paidAt: true,
      },
    }),
  ]);
  if (!organization) return null;
  return { organization, payments };
}
