// Integration tests against the real local Postgres. Skipped without DATABASE_URL.
import { config } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { listCandidatesForUser } from "./candidates";

config({ path: [".env.local", ".env"], quiet: true });

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("candidate list (database)", () => {
  let prisma: PrismaClient;
  let orgA: string;
  let orgB: string;
  let intakeA: string;
  let intakeB: string;

  const staffA = () => ({ role: "coach" as const, organizationId: orgA });

  beforeAll(async () => {
    prisma = (await import("./client")).getPrisma();
    orgA = (await prisma.organization.create({ data: { name: "Тест A" } })).id;
    orgB = (await prisma.organization.create({ data: { name: "Тест B" } })).id;
    const mk = (organizationId: string) =>
      prisma.intake.create({
        data: {
          organizationId,
          name: "Тест набор",
          birthYear: 2015,
          ageProfile: "U10_U11",
          tryoutDate: new Date("2026-12-01"),
          status: "open",
        },
      });
    intakeA = (await mk(orgA)).id;
    intakeB = (await mk(orgB)).id;

    const child = (
      intakeId: string,
      fullName: string,
      status: "registered" | "checked_in" | "evaluated",
      createdAt: string,
    ) => ({
      intakeId,
      fullName,
      birthDate: new Date("2015-05-05"),
      parentName: "Родитель",
      parentContact: "parent@example.invalid",
      consentGrantedAt: new Date(),
      consentVersion: "test",
      status,
      createdAt: new Date(createdAt),
    });
    await prisma.candidate.createMany({
      data: [
        child(intakeA, "Алихан Тестов", "registered", "2026-11-01T10:00:00Z"),
        child(
          intakeA,
          "Мария Проверкина",
          "checked_in",
          "2026-11-02T10:00:00Z",
        ),
        child(intakeA, "Алия Пример", "evaluated", "2026-11-03T10:00:00Z"),
        child(intakeB, "Чужой Ребёнок", "registered", "2026-11-01T10:00:00Z"),
      ],
    });
  });

  afterAll(async () => {
    await prisma.intake.deleteMany({
      where: { id: { in: [intakeA, intakeB] } },
    });
    await prisma.organization.deleteMany({
      where: { id: { in: [orgA, orgB] } },
    });
    await prisma.$disconnect();
  });

  it("lists every child of the intake, newest first, with the total", async () => {
    const result = await listCandidatesForUser(staffA(), intakeA, {}, prisma);
    expect(result?.total).toBe(3);
    expect(result?.items.map((c) => c.fullName)).toEqual([
      "Алия Пример",
      "Мария Проверкина",
      "Алихан Тестов",
    ]);
  });

  it("filters by status", async () => {
    const result = await listCandidatesForUser(
      staffA(),
      intakeA,
      { status: "checked_in" },
      prisma,
    );
    expect(result?.items.map((c) => c.fullName)).toEqual(["Мария Проверкина"]);
    expect(result?.total).toBe(3);
  });

  it("searches the name without regard to case", async () => {
    const result = await listCandidatesForUser(
      staffA(),
      intakeA,
      { q: "али" },
      prisma,
    );
    expect(result?.items.map((c) => c.fullName).sort()).toEqual(
      ["Алия Пример", "Алихан Тестов"].sort(),
    );
  });

  it("treats % and _ in the search as plain characters", async () => {
    const result = await listCandidatesForUser(
      staffA(),
      intakeA,
      { q: "%" },
      prisma,
    );
    expect(result?.items).toEqual([]);
  });

  it("combines search and status", async () => {
    const result = await listCandidatesForUser(
      staffA(),
      intakeA,
      { q: "али", status: "evaluated" },
      prisma,
    );
    expect(result?.items.map((c) => c.fullName)).toEqual(["Алия Пример"]);
  });

  it("returns null for another academy's intake and for a parent", async () => {
    expect(
      await listCandidatesForUser(staffA(), intakeB, {}, prisma),
    ).toBeNull();
    expect(
      await listCandidatesForUser(
        { role: "parent", organizationId: null },
        intakeA,
        {},
        prisma,
      ),
    ).toBeNull();
  });
});
