// Integration tests against the real local Postgres. Skipped without DATABASE_URL.
import { config } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { purgeEventsForTests } from "../../../tests/helpers/events";
import { listTrialProgress } from "../db/measurements";
import { listEvents } from "../events";
import { recordMeasurement } from "./record-measurement";

config({ path: [".env.local", ".env"], quiet: true });

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("recording stopwatch results (database)", () => {
  let prisma: PrismaClient;
  let orgId: string;
  let otherOrgId: string;
  let openIntakeId: string;
  let draftIntakeId: string;
  let otherIntakeId: string;
  let anna: string;
  let boris: string;
  let draftChild: string;

  let coachId: string;
  const coach = () => ({
    id: coachId,
    role: "coach" as const,
    organizationId: orgId,
  });
  const input = (overrides: Record<string, unknown> = {}) => ({
    intakeId: openIntakeId,
    trialType: "sprint_20m",
    candidateId: anna,
    attempt: 1,
    value: 4.12,
    clientEventId: crypto.randomUUID(),
    ...overrides,
  });

  const makeIntake = async (organizationId: string, status: "draft" | "open") =>
    prisma.intake.create({
      data: {
        organizationId,
        name: "Тест испытаний",
        birthYear: 2015,
        ageProfile: "U10_U11",
        tryoutDate: new Date("2026-12-01"),
        status,
        trials: {
          create: [
            "sprint_20m",
            "shuttle_5_10_5",
            "dribbling",
            "passing",
            "shooting",
          ].map((type) => ({
            type: type as "sprint_20m",
          })),
        },
      },
    });
  const makeChild = async (intakeId: string, fullName: string) =>
    (
      await prisma.candidate.create({
        data: {
          intakeId,
          fullName,
          birthDate: new Date("2015-05-05"),
          parentName: "Родитель",
          parentContact: "parent@example.invalid",
          consentGrantedAt: new Date(),
          consentVersion: "test",
        },
      })
    ).id;

  beforeAll(async () => {
    prisma = (await import("../db/client")).getPrisma();
    orgId = (
      await prisma.organization.create({ data: { name: "Тест: испытания" } })
    ).id;
    otherOrgId = (
      await prisma.organization.create({ data: { name: "Тест: чужая" } })
    ).id;
    coachId = (
      await prisma.user.create({
        data: {
          email: `coach-${crypto.randomUUID()}@example.invalid`,
          name: "Тест Тренер",
          role: "coach",
          organizationId: orgId,
        },
      })
    ).id;
    openIntakeId = (await makeIntake(orgId, "open")).id;
    draftIntakeId = (await makeIntake(orgId, "draft")).id;
    otherIntakeId = (await makeIntake(otherOrgId, "open")).id;
    anna = await makeChild(openIntakeId, "Анна Тестова");
    boris = await makeChild(openIntakeId, "Борис Тестов");
    draftChild = await makeChild(draftIntakeId, "Черновик Ребёнок");
  });

  afterAll(async () => {
    await purgeEventsForTests(prisma, orgId);
    await prisma.intake.deleteMany({
      where: { id: { in: [openIntakeId, draftIntakeId, otherIntakeId] } },
    });
    await prisma.organization.deleteMany({
      where: { id: { in: [orgId, otherOrgId] } },
    });
    await prisma.$disconnect();
  });

  it("saves a result, marks the child as arrived and writes two events without personal data", async () => {
    const eventId = crypto.randomUUID();
    const result = await recordMeasurement(
      coach(),
      input({ value: 4.056, clientEventId: eventId }),
      prisma,
    );
    expect(result).toMatchObject({ ok: true, duplicate: false });

    const saved = await prisma.measurement.findFirstOrThrow({
      where: { candidateId: anna },
    });
    expect(saved.value).toBe(4.06);
    expect(saved.source).toBe("timer");
    expect(saved.attempt).toBe(1);
    expect(saved.recordedById).toBe(coachId);

    expect(
      (await prisma.candidate.findUniqueOrThrow({ where: { id: anna } }))
        .status,
    ).toBe("checked_in");

    const events = await listEvents(
      { organizationId: orgId, intakeId: openIntakeId, participantId: anna },
      prisma,
    );
    expect(events.map((e) => e.type).sort()).toEqual([
      "measurement_recorded",
      "participant_checked_in",
    ]);
    const measured = events.find((e) => e.type === "measurement_recorded")!;
    expect(measured.id).toBe(eventId);
    expect(measured.payload).toEqual({
      trialType: "sprint_20m",
      attempt: 1,
      value: 4.06,
    });
    expect(JSON.stringify(events)).not.toContain("Анна");
  });

  it("is idempotent: sending the same save twice stores one result", async () => {
    const same = input({
      candidateId: boris,
      clientEventId: crypto.randomUUID(),
    });
    const first = await recordMeasurement(coach(), same, prisma);
    expect(first).toMatchObject({ ok: true, duplicate: false });
    // The retry gets the same measurement id back.
    expect(await recordMeasurement(coach(), same, prisma)).toEqual({
      ok: true,
      duplicate: true,
      measurementId: (first as { measurementId: string }).measurementId,
    });
    expect(
      await prisma.measurement.count({ where: { candidateId: boris } }),
    ).toBe(1);
  });

  it("refuses a second save for an attempt that is already taken", async () => {
    expect(
      await recordMeasurement(coach(), input({ value: 9.99 }), prisma),
    ).toEqual({ ok: false, code: "attempt_taken" });
    const kept = await prisma.measurement.findFirstOrThrow({
      where: { candidateId: anna, attempt: 1 },
    });
    expect(kept.value).toBe(4.06);
  });

  it("accepts the second attempt and does not repeat the arrival event", async () => {
    expect(
      await recordMeasurement(
        coach(),
        input({ attempt: 2, value: 4.01 }),
        prisma,
      ),
    ).toMatchObject({ ok: true, duplicate: false });
    const events = await listEvents(
      { organizationId: orgId, intakeId: openIntakeId, participantId: anna },
      prisma,
    );
    expect(
      events.filter((e) => e.type === "participant_checked_in"),
    ).toHaveLength(1);
    expect(
      events.filter((e) => e.type === "measurement_recorded"),
    ).toHaveLength(2);
  });

  it("saves a count of successes for passing and shooting as a manual result", async () => {
    const eventId = crypto.randomUUID();
    expect(
      await recordMeasurement(
        coach(),
        input({
          candidateId: boris,
          trialType: "passing",
          value: 7,
          clientEventId: eventId,
        }),
        prisma,
      ),
    ).toMatchObject({ ok: true, duplicate: false });
    const saved = await prisma.measurement.findFirstOrThrow({
      where: { candidateId: boris, trial: { type: "passing" } },
    });
    expect(saved.value).toBe(7);
    expect(saved.source).toBe("manual");

    const event = await prisma.event.findUniqueOrThrow({
      where: { id: eventId },
    });
    expect(event.payload).toEqual({
      trialType: "passing",
      attempt: 1,
      value: 7,
    });

    // A count above 10 and a time for a counted test are refused.
    for (const value of [11, 4.5]) {
      expect(
        await recordMeasurement(
          coach(),
          input({ candidateId: boris, trialType: "shooting", value }),
          prisma,
        ),
      ).toEqual({ ok: false, code: "invalid" });
    }
  });

  it("rejects a third attempt", async () => {
    expect(
      await recordMeasurement(coach(), input({ attempt: 3 }), prisma),
    ).toEqual({ ok: false, code: "invalid" });
  });

  it("refuses when the intake is a draft", async () => {
    expect(
      await recordMeasurement(
        coach(),
        input({ intakeId: draftIntakeId, candidateId: draftChild }),
        prisma,
      ),
    ).toEqual({ ok: false, code: "closed" });
  });

  it("treats another academy's intake and a child from another intake as not found", async () => {
    expect(
      await recordMeasurement(
        coach(),
        input({ intakeId: otherIntakeId }),
        prisma,
      ),
    ).toEqual({ ok: false, code: "not_found" });
    expect(
      await recordMeasurement(
        coach(),
        input({ candidateId: draftChild }),
        prisma,
      ),
    ).toEqual({ ok: false, code: "not_found" });
  });

  it("lists the saved attempts for the trial screen", async () => {
    const progress = await listTrialProgress(
      coach(),
      openIntakeId,
      "sprint_20m",
      prisma,
    );
    const byName = Object.fromEntries(
      progress!.map((p) => [p.fullName, p.attempts]),
    );
    expect(byName["Анна Тестова"]).toEqual([
      { id: expect.any(String), attempt: 1, value: 4.06 },
      { id: expect.any(String), attempt: 2, value: 4.01 },
    ]);
    expect(byName["Борис Тестов"]).toHaveLength(1);

    expect(
      await listTrialProgress(coach(), otherIntakeId, "sprint_20m", prisma),
    ).toBeNull();
    const other = await listTrialProgress(
      coach(),
      openIntakeId,
      "dribbling",
      prisma,
    );
    expect(other!.every((p) => p.attempts.length === 0)).toBe(true);
  });
});
