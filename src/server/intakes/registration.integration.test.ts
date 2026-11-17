// Integration tests against the real local Postgres. Skipped without DATABASE_URL.
import { config } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { purgeEventsForTests } from "../../../tests/helpers/events";
import { createLoginThrottle } from "../auth/login-throttle";
import { listEvents } from "../events";
import { ForbiddenError } from "./create-intake";
import { publishIntake } from "./publish-intake";
import { registerCandidate } from "./register-candidate";

config({ path: [".env.local", ".env"], quiet: true });

const hasDatabase = Boolean(process.env.DATABASE_URL);
const today = new Date("2026-11-17T12:00:00Z");

describe.skipIf(!hasDatabase)("publishing and registration (database)", () => {
  let prisma: PrismaClient;
  let organizationId: string;
  let otherOrganizationId: string;
  let intakeId: string;
  const director = () => ({
    id: crypto.randomUUID(),
    role: "director" as const,
    organizationId,
  });
  const form = (overrides: Record<string, unknown> = {}) => ({
    fullName: `Тест Ребёнок ${crypto.randomUUID().slice(0, 8)}`,
    birthDate: "2015-04-20",
    parentName: "Тест Родитель",
    parentContact: "parent@example.invalid",
    consent: "on",
    ...overrides,
  });
  const options = () => ({
    prisma,
    today,
    throttle: createLoginThrottle({ maxFailures: 1000, windowMs: 60_000 }),
    ip: "203.0.113.9",
  });

  beforeAll(async () => {
    prisma = (await import("../db/client")).getPrisma();
    organizationId = (
      await prisma.organization.create({ data: { name: "Тест: академия" } })
    ).id;
    otherOrganizationId = (
      await prisma.organization.create({ data: { name: "Тест: чужая" } })
    ).id;
    intakeId = (
      await prisma.intake.create({
        data: {
          organizationId,
          name: "Тест: набор",
          birthYear: 2015,
          ageProfile: "U10_U11",
          tryoutDate: new Date("2026-12-01"),
        },
      })
    ).id;
  });

  afterAll(async () => {
    await purgeEventsForTests(prisma, organizationId);
    await prisma.intake.deleteMany({
      where: { organizationId: { in: [organizationId, otherOrganizationId] } },
    });
    await prisma.organization.deleteMany({
      where: { id: { in: [organizationId, otherOrganizationId] } },
    });
    await prisma.$disconnect();
  });

  it("does not accept registrations while the intake is a draft", async () => {
    expect(await registerCandidate(intakeId, form(), options())).toEqual({
      ok: false,
      code: "closed",
    });
    expect(await prisma.candidate.count({ where: { intakeId } })).toBe(0);
  });

  it("refuses a coach, and an admin of another academy sees nothing to publish", async () => {
    await expect(
      publishIntake(
        { id: crypto.randomUUID(), role: "coach", organizationId },
        intakeId,
        prisma,
      ),
    ).rejects.toThrow(ForbiddenError);
    expect(
      await publishIntake(
        {
          id: crypto.randomUUID(),
          role: "admin",
          organizationId: otherOrganizationId,
        },
        intakeId,
        prisma,
      ),
    ).toBe("not_found");
    expect(
      (await prisma.intake.findUniqueOrThrow({ where: { id: intakeId } }))
        .status,
    ).toBe("draft");
  });

  it("publishes once: opens registration and writes tryout_published", async () => {
    expect(await publishIntake(director(), intakeId, prisma)).toBe("published");
    expect(await publishIntake(director(), intakeId, prisma)).toBe("not_draft");

    const events = await listEvents({ organizationId, intakeId }, prisma);
    expect(events.filter((e) => e.type === "tryout_published")).toHaveLength(1);
  });

  it("registers a child with consent and writes two journal events without personal data", async () => {
    const input = form();
    expect(await registerCandidate(intakeId, input, options())).toEqual({
      ok: true,
    });

    const candidate = await prisma.candidate.findFirstOrThrow({
      where: { intakeId, fullName: input.fullName },
    });
    expect(candidate.consentVersion).toBe("draft-v0");
    expect(candidate.consentGrantedAt).toBeInstanceOf(Date);
    expect(candidate.status).toBe("registered");

    const events = await listEvents(
      { organizationId, intakeId, participantId: candidate.id },
      prisma,
    );
    expect(events.map((e) => e.type)).toEqual([
      "registration_created",
      "consent_granted",
    ]);
    expect(events[1].previousEventId).toBe(events[0].id);
    expect(events[0].ipHash).toMatch(/^[0-9a-f]{64}$/);
    const stored = JSON.stringify(events);
    expect(stored).not.toContain(input.fullName);
    expect(stored).not.toContain(input.parentContact);
  });

  it("rejects a child born in another year than the intake's group", async () => {
    const before = await prisma.candidate.count({ where: { intakeId } });
    expect(
      await registerCandidate(
        intakeId,
        form({ birthDate: "2016-01-10" }),
        options(),
      ),
    ).toEqual({ ok: false, errors: { birthDate: "birth_year_mismatch" } });
    expect(await prisma.candidate.count({ where: { intakeId } })).toBe(before);
  });

  it("rejects the same child registered twice", async () => {
    const input = form();
    await registerCandidate(intakeId, input, options());
    expect(
      await registerCandidate(
        intakeId,
        { ...input, fullName: input.fullName.toUpperCase() },
        options(),
      ),
    ).toEqual({ ok: false, code: "duplicate" });
  });

  it("does not store anything when the consent box is not checked", async () => {
    const before = await prisma.candidate.count({ where: { intakeId } });
    const result = await registerCandidate(
      intakeId,
      form({ consent: undefined }),
      options(),
    );
    expect(result).toMatchObject({
      ok: false,
      errors: { consent: "consent_required" },
    });
    expect(await prisma.candidate.count({ where: { intakeId } })).toBe(before);
  });

  it("does not store anything for a bot (honeypot filled)", async () => {
    const before = await prisma.candidate.count({ where: { intakeId } });
    await registerCandidate(intakeId, form({ website: "spam" }), options());
    expect(await prisma.candidate.count({ where: { intakeId } })).toBe(before);
  });
});
