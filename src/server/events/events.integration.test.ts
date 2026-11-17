// Integration tests against the real local Postgres. Skipped without DATABASE_URL.
import { config } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { purgeEventsForTests } from "../../../tests/helpers/events";
import { EventError, listEvents, recordEvent, type EventInput } from "./index";

config({ path: [".env.local", ".env"], quiet: true });

const hasDatabase = Boolean(process.env.DATABASE_URL);

// Prisma words a trigger rejection as a generic constraint error; the
// database's own message ("events is append-only: ...") sits in `meta`.
async function expectBlocked(operation: Promise<unknown>) {
  const error = (await operation.then(
    () => null,
    (caught: unknown) => caught,
  )) as { meta?: unknown } | null;
  expect(error, "the operation should have been rejected").not.toBeNull();
  expect(JSON.stringify(error?.meta)).toContain("append-only");
}

describe.skipIf(!hasDatabase)("event journal", () => {
  let prisma: PrismaClient;
  // A fresh academy id per run keeps test rows apart from real data.
  const organizationId = crypto.randomUUID();
  const intakeId = crypto.randomUUID();
  const participantId = crypto.randomUUID();

  const make = (overrides: Partial<EventInput> = {}): EventInput => ({
    id: crypto.randomUUID(),
    type: "measurement_recorded",
    organizationId,
    intakeId,
    participantId,
    occurredAtDevice: new Date("2026-12-01T10:00:00Z"),
    payload: { value: 4.05, attempt: 1 },
    source: "mobile_offline",
    ...overrides,
  });

  beforeAll(async () => {
    prisma = (await import("../db/client")).getPrisma();
  });

  afterAll(async () => {
    await purgeEventsForTests(prisma, organizationId);
    await prisma.$disconnect();
  });

  it("stores an event with its payload hash and server time", async () => {
    const { event, created } = await recordEvent(make(), prisma);
    expect(created).toBe(true);
    expect(event.payloadHash).toMatch(/^[0-9a-f]{64}$/);
    expect(event.occurredAtServer).toBeInstanceOf(Date);
    expect(event.previousEventId).toBeNull();
  });

  it("is idempotent: sending the same event twice stores it once", async () => {
    const input = make({ participantId: crypto.randomUUID() });
    const first = await recordEvent(input, prisma);
    const second = await recordEvent(input, prisma);
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.event.id).toBe(first.event.id);
    expect(await prisma.event.count({ where: { id: input.id } })).toBe(1);
  });

  it("treats a payload with reordered keys as the same event", async () => {
    const input = make({
      participantId: crypto.randomUUID(),
      payload: { a: 1, b: 2 },
    });
    await recordEvent(input, prisma);
    const again = await recordEvent(
      { ...input, payload: { b: 2, a: 1 } },
      prisma,
    );
    expect(again.created).toBe(false);
  });

  it("refuses to reuse an id for different content", async () => {
    const input = make({ participantId: crypto.randomUUID() });
    await recordEvent(input, prisma);
    await expect(
      recordEvent({ ...input, payload: { value: 9.99 } }, prisma),
    ).rejects.toThrow(EventError);
  });

  it("chains events about the same participant", async () => {
    const who = crypto.randomUUID();
    const a = await recordEvent(make({ participantId: who }), prisma);
    const b = await recordEvent(
      make({ participantId: who, type: "measurement_corrected" }),
      prisma,
    );
    const c = await recordEvent(make({ participantId: who }), prisma);
    expect(b.event.previousEventId).toBe(a.event.id);
    expect(c.event.previousEventId).toBe(b.event.id);

    const events = await listEvents(
      { organizationId, participantId: who },
      prisma,
    );
    expect(events.map((e) => e.id)).toEqual([
      a.event.id,
      b.event.id,
      c.event.id,
    ]);
  });

  it("starts a separate chain for another participant", async () => {
    const result = await recordEvent(
      make({ participantId: crypto.randomUUID() }),
      prisma,
    );
    expect(result.event.previousEventId).toBeNull();
  });

  it("rejects personal data in the payload", async () => {
    await expect(
      recordEvent(make({ payload: { fullName: "Имя Фамилия" } }), prisma),
    ).rejects.toThrow(/personal data/);
  });

  it("rejects invalid input", async () => {
    await expect(
      recordEvent(make({ organizationId: "nope" }), prisma),
    ).rejects.toThrow(EventError);
  });

  describe("append-only guard in the database", () => {
    it("blocks UPDATE", async () => {
      const { event } = await recordEvent(
        make({ participantId: crypto.randomUUID() }),
        prisma,
      );
      await expectBlocked(
        prisma.event.update({
          where: { id: event.id },
          data: { payload: { value: 0 } },
        }),
      );
    });

    it("blocks DELETE", async () => {
      const { event } = await recordEvent(
        make({ participantId: crypto.randomUUID() }),
        prisma,
      );
      await expectBlocked(prisma.event.delete({ where: { id: event.id } }));
      expect(
        await prisma.event.findUnique({ where: { id: event.id } }),
      ).not.toBeNull();
    });

    it("blocks bulk deletes and TRUNCATE", async () => {
      await expectBlocked(
        prisma.event.deleteMany({ where: { organizationId } }),
      );
      await expectBlocked(prisma.$executeRawUnsafe('TRUNCATE "events"'));
    });
  });
});
