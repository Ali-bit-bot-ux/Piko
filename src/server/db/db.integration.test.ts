// Integration test against the real local Postgres. It is skipped when
// DATABASE_URL is not set (for example on a machine without a database).
import { config } from "dotenv";
import { afterAll, describe, expect, it } from "vitest";

config({ path: [".env.local", ".env"], quiet: true });

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("database (needs seed: npm run db:seed)", () => {
  // Imported lazily so the generated client is not loaded when skipped.
  const load = async () => (await import("./client")).getPrisma();

  afterAll(async () => {
    if (hasDatabase) await (await load()).$disconnect();
  });

  it("contains the demo data created by the seed", async () => {
    const prisma = await load();
    const intake = await prisma.intake.findFirstOrThrow({
      where: { name: "Демо-набор 2015" },
      include: { trials: true, candidates: true },
    });
    expect(intake.ageProfile).toBe("U10_U11");
    expect(intake.trials).toHaveLength(5);
    expect(intake.candidates).toHaveLength(3);
  });

  it("stores two sprint attempts for the first demo candidate", async () => {
    const prisma = await load();
    const candidate = await prisma.candidate.findFirstOrThrow({
      where: { fullName: "Демо Кандидат А" },
      include: { measurements: true, evaluations: true },
    });
    expect(candidate.measurements.map((m) => m.attempt).sort()).toEqual([1, 2]);
    expect(candidate.evaluations[0]?.score).toBe(4);
  });

  it("rejects a second measurement with the same attempt number", async () => {
    const prisma = await load();
    const candidate = await prisma.candidate.findFirstOrThrow({
      where: { fullName: "Демо Кандидат А" },
      include: { measurements: true },
    });
    const existing = candidate.measurements[0];
    await expect(
      prisma.measurement.create({
        data: {
          candidateId: candidate.id,
          trialId: existing.trialId,
          attempt: existing.attempt,
          value: 9.99,
        },
      }),
    ).rejects.toThrow();
  });

  it("deletes personal data with the candidate but keeps the event journal", async () => {
    const prisma = await load();
    const intake = await prisma.intake.findFirstOrThrow({
      where: { name: "Демо-набор 2015" },
      include: { trials: true },
    });
    const trial = intake.trials[0];
    const candidate = await prisma.candidate.create({
      data: {
        intakeId: intake.id,
        fullName: "Временный Кандидат",
        birthDate: new Date("2015-01-01"),
        parentName: "Временный Родитель",
        parentContact: "tmp@example.invalid",
        consentGrantedAt: new Date(),
        consentVersion: "test",
        measurements: {
          create: { trialId: trial.id, attempt: 1, value: 5 },
        },
      },
    });
    const eventId = crypto.randomUUID();
    await prisma.event.create({
      data: {
        id: eventId,
        type: "registration_created",
        organizationId: intake.organizationId,
        intakeId: intake.id,
        participantId: candidate.id,
        occurredAtDevice: new Date(),
        payload: {},
        payloadHash: "test",
        source: "system",
      },
    });

    await prisma.candidate.delete({ where: { id: candidate.id } });

    expect(
      await prisma.measurement.count({ where: { candidateId: candidate.id } }),
    ).toBe(0);
    expect(
      await prisma.event.findUnique({ where: { id: eventId } }),
    ).not.toBeNull();

    await prisma.event.delete({ where: { id: eventId } });
  });
});
