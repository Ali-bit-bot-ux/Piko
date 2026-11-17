// Integration tests against the real local Postgres. Skipped without DATABASE_URL.
import { config } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { purgeEventsForTests } from "../../../tests/helpers/events";
import { listEvents } from "../events";
import { correctMeasurement } from "./correct-measurement";
import { recordMeasurement } from "./record-measurement";

config({ path: [".env.local", ".env"], quiet: true });

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("correcting a saved result (database)", () => {
  let prisma: PrismaClient;
  let orgId: string;
  let otherOrgId: string;
  let intakeId: string;
  let finishedIntakeId: string;
  let otherIntakeId: string;
  let childId: string;
  let finishedChildId: string;
  let timeId: string;
  let countId: string;
  let finishedMeasurementId: string;
  let coachId: string;
  let otherCoachId: string;

  const coach = () => ({
    id: coachId,
    role: "coach" as const,
    organizationId: orgId,
  });
  const outsider = () => ({
    id: otherCoachId,
    role: "coach" as const,
    organizationId: otherOrgId,
  });
  const input = (overrides: Record<string, unknown> = {}) => ({
    intakeId,
    measurementId: timeId,
    value: 4.5,
    reason: "Секундомер нажали поздно",
    clientEventId: crypto.randomUUID(),
    ...overrides,
  });

  const makeIntake = (organizationId: string, status: "open" | "finished") =>
    prisma.intake.create({
      data: {
        organizationId,
        name: "Тест исправлений",
        birthYear: 2015,
        ageProfile: "U10_U11",
        tryoutDate: new Date("2026-12-01"),
        status,
        trials: {
          create: (["sprint_20m", "passing"] as const).map((type) => ({
            type,
          })),
        },
      },
    });
  const makeChild = async (id: string) =>
    (
      await prisma.candidate.create({
        data: {
          intakeId: id,
          fullName: "Вера Исправлена",
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
      await prisma.organization.create({ data: { name: "Тест: исправления" } })
    ).id;
    otherOrgId = (
      await prisma.organization.create({ data: { name: "Тест: чужая 2" } })
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
    otherCoachId = (
      await prisma.user.create({
        data: {
          email: `coach-${crypto.randomUUID()}@example.invalid`,
          name: "Тест Чужой",
          role: "coach",
          organizationId: otherOrgId,
        },
      })
    ).id;
    intakeId = (await makeIntake(orgId, "open")).id;
    finishedIntakeId = (await makeIntake(orgId, "finished")).id;
    otherIntakeId = (await makeIntake(otherOrgId, "open")).id;
    childId = await makeChild(intakeId);
    finishedChildId = await makeChild(finishedIntakeId);

    await recordMeasurement(
      coach(),
      {
        intakeId,
        trialType: "sprint_20m",
        candidateId: childId,
        attempt: 1,
        value: 5.1,
        clientEventId: crypto.randomUUID(),
      },
      prisma,
    );
    await recordMeasurement(
      coach(),
      {
        intakeId,
        trialType: "passing",
        candidateId: childId,
        attempt: 1,
        value: 6,
        clientEventId: crypto.randomUUID(),
      },
      prisma,
    );
    const rows = await prisma.measurement.findMany({
      where: { candidateId: childId },
      include: { trial: true },
    });
    timeId = rows.find((r) => r.trial.type === "sprint_20m")!.id;
    countId = rows.find((r) => r.trial.type === "passing")!.id;

    const trial = await prisma.trial.findFirstOrThrow({
      where: { intakeId: finishedIntakeId, type: "sprint_20m" },
    });
    finishedMeasurementId = (
      await prisma.measurement.create({
        data: {
          candidateId: finishedChildId,
          trialId: trial.id,
          attempt: 1,
          value: 4.9,
        },
      })
    ).id;
  });

  afterAll(async () => {
    await purgeEventsForTests(prisma, orgId);
    await prisma.intake.deleteMany({
      where: { id: { in: [intakeId, finishedIntakeId, otherIntakeId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [coachId, otherCoachId] } },
    });
    await prisma.organization.deleteMany({
      where: { id: { in: [orgId, otherOrgId] } },
    });
    await prisma.$disconnect();
  });

  it("changes the value and journals the old value, reason and author without personal data", async () => {
    const eventId = crypto.randomUUID();
    expect(
      await correctMeasurement(
        coach(),
        input({ value: 4.549, clientEventId: eventId }),
        prisma,
      ),
    ).toEqual({ ok: true, duplicate: false, value: 4.55 });

    expect(
      (await prisma.measurement.findUniqueOrThrow({ where: { id: timeId } }))
        .value,
    ).toBe(4.55);

    const events = await listEvents(
      { organizationId: orgId, intakeId, participantId: childId },
      prisma,
    );
    const corrected = events.find((e) => e.type === "measurement_corrected")!;
    expect(corrected.id).toBe(eventId);
    expect(corrected.actorId).toBe(coachId);
    expect(corrected.payload).toEqual({
      trialType: "sprint_20m",
      attempt: 1,
      previousValue: 5.1,
      value: 4.55,
      reason: "Секундомер нажали поздно",
    });
    expect(JSON.stringify(events)).not.toContain("Вера");
    // The first save is still in the journal.
    expect(
      events.filter((e) => e.type === "measurement_recorded"),
    ).toHaveLength(2);
  });

  it("is idempotent: the same correction sent twice is applied once", async () => {
    const same = input({ value: 4.4 });
    expect(await correctMeasurement(coach(), same, prisma)).toMatchObject({
      ok: true,
      duplicate: false,
    });
    expect(await correctMeasurement(coach(), same, prisma)).toMatchObject({
      ok: true,
      duplicate: true,
    });
    const events = await listEvents(
      { organizationId: orgId, intakeId, participantId: childId },
      prisma,
    );
    expect(
      events.filter((e) => e.type === "measurement_corrected"),
    ).toHaveLength(2);
  });

  it("requires a reason", async () => {
    for (const reason of ["", "  ", "ab", undefined, "я".repeat(301)]) {
      expect(
        await correctMeasurement(coach(), input({ reason }), prisma),
      ).toEqual({
        ok: false,
        code: "invalid",
      });
    }
  });

  it("applies the rules of the test: a count is a whole number 0..10", async () => {
    for (const value of [11, 4.5, -1]) {
      expect(
        await correctMeasurement(
          coach(),
          input({ measurementId: countId, value }),
          prisma,
        ),
      ).toEqual({ ok: false, code: "invalid" });
    }
    expect(
      await correctMeasurement(
        coach(),
        input({ measurementId: countId, value: 8 }),
        prisma,
      ),
    ).toMatchObject({ ok: true });
    expect(
      (await prisma.measurement.findUniqueOrThrow({ where: { id: countId } }))
        .value,
    ).toBe(8);
    expect(
      await correctMeasurement(coach(), input({ value: 0 }), prisma),
    ).toEqual({ ok: false, code: "invalid" });
  });

  it("refuses a correction that changes nothing", async () => {
    expect(
      await correctMeasurement(
        coach(),
        input({ measurementId: countId, value: 8 }),
        prisma,
      ),
    ).toEqual({ ok: false, code: "unchanged" });
  });

  it("treats another academy's data and an unknown measurement as not found", async () => {
    expect(await correctMeasurement(outsider(), input(), prisma)).toEqual({
      ok: false,
      code: "not_found",
    });
    // The intake is the user's own, the measurement is not in it.
    expect(
      await correctMeasurement(
        coach(),
        input({ measurementId: finishedMeasurementId }),
        prisma,
      ),
    ).toEqual({ ok: false, code: "not_found" });
    expect(
      await correctMeasurement(
        coach(),
        input({ measurementId: crypto.randomUUID() }),
        prisma,
      ),
    ).toEqual({ ok: false, code: "not_found" });
  });

  it("refuses when the intake is finished", async () => {
    expect(
      await correctMeasurement(
        coach(),
        input({
          intakeId: finishedIntakeId,
          measurementId: finishedMeasurementId,
        }),
        prisma,
      ),
    ).toEqual({ ok: false, code: "closed" });
  });

  it("refuses a parent or a user without an academy", async () => {
    for (const user of [
      { id: "u", role: "parent" as const, organizationId: null },
      { id: "u", role: "coach" as const, organizationId: null },
    ]) {
      expect(await correctMeasurement(user, input(), prisma)).toEqual({
        ok: false,
        code: "forbidden",
      });
    }
  });
});
