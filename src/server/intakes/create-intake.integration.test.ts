// Integration test against the real local Postgres with the seed data.
// Skipped when DATABASE_URL is not set.
import { config } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { createIntake, ForbiddenError } from "./create-intake";

config({ path: [".env.local", ".env"], quiet: true });

const hasDatabase = Boolean(process.env.DATABASE_URL);
// Organization created by prisma/seed.ts.
const SEED_ORG_ID = "11111111-1111-4111-8111-111111111111";
const today = new Date("2026-11-17T12:00:00Z");

describe.skipIf(!hasDatabase)("createIntake (database)", () => {
  let prisma: PrismaClient;
  // Counts only this academy's intakes: other test files run in parallel and
  // create intakes in their own academies.
  const countOwnIntakes = () =>
    prisma.intake.count({ where: { organizationId: SEED_ORG_ID } });
  const created: string[] = [];
  const name = `Тестовый набор ${crypto.randomUUID()}`;

  beforeAll(async () => {
    prisma = (await import("../db/client")).getPrisma();
  });

  afterAll(async () => {
    await prisma.intake.deleteMany({ where: { id: { in: created } } });
    await prisma.$disconnect();
  });

  it("creates a draft intake with five trials in the user's own academy", async () => {
    const result = await createIntake(
      { role: "director", organizationId: SEED_ORG_ID },
      { name, birthYear: "2015", tryoutDate: "2026-12-01" },
      { prisma, today },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    created.push(result.intakeId);

    const intake = await prisma.intake.findUniqueOrThrow({
      where: { id: result.intakeId },
      include: { trials: true },
    });
    expect(intake.organizationId).toBe(SEED_ORG_ID);
    expect(intake.status).toBe("draft");
    expect(intake.ageProfile).toBe("U10_U11");
    expect(intake.tryoutDate.toISOString()).toBe("2026-12-01T00:00:00.000Z");
    expect(intake.trials.map((t) => t.type).sort()).toEqual(
      [
        "dribbling",
        "passing",
        "shooting",
        "shuttle_5_10_5",
        "sprint_20m",
      ].sort(),
    );
  });

  it("derives the age profile from the birth year", async () => {
    const result = await createIntake(
      { role: "admin", organizationId: SEED_ORG_ID },
      { name: `${name} U12`, birthYear: "2013", tryoutDate: "2026-12-01" },
      { prisma, today },
    );
    if (!result.ok) throw new Error("expected success");
    created.push(result.intakeId);
    const intake = await prisma.intake.findUniqueOrThrow({
      where: { id: result.intakeId },
    });
    expect(intake.ageProfile).toBe("U12_U14");
  });

  it("does not create anything for invalid input", async () => {
    const before = await countOwnIntakes();
    const result = await createIntake(
      { role: "director", organizationId: SEED_ORG_ID },
      { name, birthYear: "2022", tryoutDate: "2026-12-01" },
      { prisma, today },
    );
    expect(result).toEqual({
      ok: false,
      errors: { birthYear: "age_out_of_range" },
    });
    expect(await countOwnIntakes()).toBe(before);
  });

  it("refuses a coach and creates nothing", async () => {
    const before = await countOwnIntakes();
    await expect(
      createIntake(
        { role: "coach", organizationId: SEED_ORG_ID },
        { name, birthYear: "2015", tryoutDate: "2026-12-01" },
        { prisma, today },
      ),
    ).rejects.toThrow(ForbiddenError);
    expect(await countOwnIntakes()).toBe(before);
  });
});
