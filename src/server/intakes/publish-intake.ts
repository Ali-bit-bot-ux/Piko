import type { PrismaClient } from "@/generated/prisma/client";
import { canManageIntakes, type SessionUser } from "../auth/policy";
import { getPrisma } from "../db/client";
import { findIntakeForUser } from "../db/intakes";
import { recordEvent } from "../events";
import { ForbiddenError } from "./create-intake";

export type PublishResult = "published" | "not_found" | "not_draft";

/**
 * Opens registration: draft -> open, and writes `tryout_published` to the
 * journal in the same transaction. Only admin and director of the intake's
 * own academy may do it.
 */
export async function publishIntake(
  user: Pick<SessionUser, "id" | "role" | "organizationId">,
  intakeId: string,
  prisma: PrismaClient = getPrisma(),
): Promise<PublishResult> {
  if (!canManageIntakes(user) || user.organizationId === null) {
    throw new ForbiddenError();
  }
  const organizationId = user.organizationId;

  const intake = await findIntakeForUser(user, intakeId, prisma);
  if (!intake) return "not_found";

  return prisma.$transaction(async (tx) => {
    // Conditional update: two people clicking at once publish it only once.
    const changed = await tx.intake.updateMany({
      where: { id: intake.id, organizationId, status: "draft" },
      data: { status: "open" },
    });
    if (changed.count === 0) return "not_draft" as const;

    await recordEvent(
      {
        id: crypto.randomUUID(),
        type: "tryout_published",
        actorId: user.id,
        actorRole: user.role,
        organizationId,
        intakeId: intake.id,
        occurredAtDevice: new Date(),
        payload: { ageProfile: intake.ageProfile },
        source: "web",
      },
      tx,
    );
    return "published" as const;
  });
}
