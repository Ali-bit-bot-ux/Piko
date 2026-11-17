// The offline queue sending to the real server logic and database (skipped
// without DATABASE_URL). It is what the coach's phone does after a bad connection.
import { config } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { purgeEventsForTests } from "../../../tests/helpers/events";
import {
  createOfflineQueue,
  flushQueue,
  type QueueStorage,
} from "@/lib/offline-queue";
import { outcomeOf } from "@/lib/send-outcome";
import { recordMeasurement } from "./record-measurement";

config({ path: [".env.local", ".env"], quiet: true });

const hasDatabase = Boolean(process.env.DATABASE_URL);

function memoryStorage(): QueueStorage {
  const data: Record<string, string> = {};
  return {
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    },
  };
}

describe.skipIf(!hasDatabase)("offline queue to the server (database)", () => {
  let prisma: PrismaClient;
  let orgId: string;
  let coachId: string;
  let intakeId: string;
  let childId: string;

  beforeAll(async () => {
    prisma = (await import("../db/client")).getPrisma();
    orgId = (
      await prisma.organization.create({ data: { name: "Тест: офлайн" } })
    ).id;
    coachId = (
      await prisma.user.create({
        data: {
          email: `coach-${crypto.randomUUID()}@example.invalid`,
          name: "Тест Тренер офлайн",
          role: "coach",
          organizationId: orgId,
        },
      })
    ).id;
    const intake = await prisma.intake.create({
      data: {
        organizationId: orgId,
        name: "Тест офлайн",
        birthYear: 2015,
        ageProfile: "U10_U11",
        tryoutDate: new Date("2026-12-01"),
        status: "open",
        trials: { create: [{ type: "sprint_20m" }] },
      },
    });
    intakeId = intake.id;
    childId = (
      await prisma.candidate.create({
        data: {
          intakeId,
          fullName: "Офлайн Ребёнок",
          birthDate: new Date("2015-05-05"),
          parentName: "Родитель",
          parentContact: "parent@example.invalid",
          consentGrantedAt: new Date(),
          consentVersion: "test",
        },
      })
    ).id;
  });

  afterAll(async () => {
    await purgeEventsForTests(prisma, orgId);
    await prisma.intake.deleteMany({ where: { id: intakeId } });
    await prisma.user.deleteMany({ where: { id: coachId } });
    await prisma.organization.deleteMany({ where: { id: orgId } });
    await prisma.$disconnect();
  });

  const payload = (overrides: Record<string, unknown> = {}) => ({
    intakeId,
    trialType: "sprint_20m" as const,
    candidateId: childId,
    attempt: 1,
    value: 4.2,
    clientEventId: crypto.randomUUID(),
    ...overrides,
  });

  const user = () => ({
    id: coachId,
    role: "coach" as const,
    organizationId: orgId,
  });

  it("sends queued results in order, once each, and drops one the server refuses", async () => {
    const queue = createOfflineQueue<ReturnType<typeof payload>>(
      memoryStorage(),
      "k",
    );
    const first = payload({ attempt: 1, value: 4.2 });
    // A second phone queued the same attempt number with another event id.
    const clash = payload({ attempt: 1, value: 9.9 });
    const second = payload({ attempt: 2, value: 4.05 });
    for (const item of [first, clash, second]) {
      queue.add({ id: item.clientEventId, payload: item, queuedAt: 1 });
    }

    const result = await flushQueue(queue, async (item) =>
      outcomeOf(await recordMeasurement(user(), item.payload, prisma)),
    );

    expect(result.sent).toEqual([first.clientEventId, second.clientEventId]);
    expect(result.dropped).toEqual([clash.clientEventId]);
    expect(result.remaining).toBe(0);

    const saved = await prisma.measurement.findMany({
      where: { candidateId: childId },
      orderBy: { attempt: "asc" },
    });
    expect(saved.map((m) => [m.attempt, m.value])).toEqual([
      [1, 4.2],
      [2, 4.05],
    ]);
  });

  it("a result sent twice (the answer got lost) is stored once", async () => {
    const again = payload({ attempt: 1, value: 4.2 });
    // Send it, then send the very same item again as a retry would.
    const queue = createOfflineQueue<ReturnType<typeof payload>>(
      memoryStorage(),
      "k2",
    );
    const twin = payload({ candidateId: childId, attempt: 2 });
    queue.add({ id: twin.clientEventId, payload: twin, queuedAt: 1 });
    // attempt 2 already exists from the previous test with another event id:
    // the server refuses it as taken, so the queue drops it instead of looping.
    const result = await flushQueue(queue, async (item) =>
      outcomeOf(await recordMeasurement(user(), item.payload, prisma)),
    );
    expect(result.dropped).toEqual([twin.clientEventId]);
    expect(result.remaining).toBe(0);
    void again;

    // The same event id twice is a harmless duplicate.
    const fresh = await prisma.candidate.create({
      data: {
        intakeId,
        fullName: "Офлайн Ребёнок Два",
        birthDate: new Date("2015-06-06"),
        parentName: "Родитель",
        parentContact: "parent2@example.invalid",
        consentGrantedAt: new Date(),
        consentVersion: "test",
      },
    });
    const once = payload({ candidateId: fresh.id, attempt: 1, value: 5.5 });
    for (let i = 0; i < 2; i++) {
      expect(outcomeOf(await recordMeasurement(user(), once, prisma))).toBe(
        "sent",
      );
    }
    expect(
      await prisma.measurement.count({ where: { candidateId: fresh.id } }),
    ).toBe(1);
  });

  it("keeps a result when the server is not reachable (retry)", async () => {
    const queue = createOfflineQueue<ReturnType<typeof payload>>(
      memoryStorage(),
      "k3",
    );
    const item = payload({ attempt: 1 });
    queue.add({ id: item.clientEventId, payload: item, queuedAt: 1 });
    const result = await flushQueue(queue, async () => {
      throw new TypeError("fetch failed");
    });
    expect(result).toEqual({ sent: [], dropped: [], remaining: 1 });
  });
});
