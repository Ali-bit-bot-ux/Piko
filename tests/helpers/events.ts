import type { PrismaClient } from "@/generated/prisma/client";

/** TEST ONLY. Removes specific events by id (see purgeEventsForTests). */
export async function purgeEventIdsForTests(
  prisma: PrismaClient,
  ids: string[],
): Promise<void> {
  await prisma.$transaction([
    prisma.$executeRawUnsafe(
      'ALTER TABLE "events" DISABLE TRIGGER events_no_update_delete',
    ),
    prisma.$executeRaw`DELETE FROM "events" WHERE "id" = ANY(${ids}::uuid[])`,
    prisma.$executeRawUnsafe(
      'ALTER TABLE "events" ENABLE TRIGGER events_no_update_delete',
    ),
  ]);
}

/**
 * TEST ONLY. The journal is append-only, so cleaning up after a test needs
 * table ownership: it switches the guard trigger off for one transaction.
 */
export async function purgeEventsForTests(
  prisma: PrismaClient,
  organizationId: string,
): Promise<void> {
  await prisma.$transaction([
    prisma.$executeRawUnsafe(
      'ALTER TABLE "events" DISABLE TRIGGER events_no_update_delete',
    ),
    prisma.$executeRaw`DELETE FROM "events" WHERE "organizationId" = ${organizationId}::uuid`,
    prisma.$executeRawUnsafe(
      'ALTER TABLE "events" ENABLE TRIGGER events_no_update_delete',
    ),
  ]);
}
