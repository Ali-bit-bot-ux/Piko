// Integration tests against the real local Postgres with the seed data
// (npm run db:seed). Skipped when DATABASE_URL is not set.
import { config } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { findIntakeForUser, listIntakesForUser } from "../db/intakes";
import { authenticate } from "./credentials";
import { createLoginThrottle } from "./login-throttle";
import type { SessionUser } from "./policy";

config({ path: [".env.local", ".env"], quiet: true });

const hasDatabase = Boolean(process.env.DATABASE_URL);
// Local development password set by prisma/seed.ts.
const DEMO_PASSWORD = "piko-demo-2026";

const newThrottle = () =>
  createLoginThrottle({ maxFailures: 3, windowMs: 60_000 });

describe.skipIf(!hasDatabase)("authentication and academy isolation", () => {
  let prisma: PrismaClient;
  let director: SessionUser;
  let otherOrgId: string;
  let otherIntakeId: string;
  let parentEmail: string;

  beforeAll(async () => {
    prisma = (await import("../db/client")).getPrisma();

    const found = await authenticate(
      { email: "demo-director@example.invalid", password: DEMO_PASSWORD },
      { prisma, throttle: newThrottle() },
    );
    if (found.status !== "ok") throw new Error("Run `npm run db:seed` first");
    director = found.user;

    // A second academy with its own intake, and a parent with a password.
    const other = await prisma.organization.create({
      data: { name: "Тестовая чужая академия" },
    });
    otherOrgId = other.id;
    const intake = await prisma.intake.create({
      data: {
        organizationId: other.id,
        name: "Чужой набор",
        birthYear: 2014,
        ageProfile: "U10_U11",
        tryoutDate: new Date("2026-12-02"),
      },
    });
    otherIntakeId = intake.id;

    parentEmail = `parent-${crypto.randomUUID()}@example.invalid`;
    const { hashPassword } = await import("./password");
    await prisma.user.create({
      data: {
        email: parentEmail,
        name: "Тестовый родитель",
        role: "parent",
        passwordHash: await hashPassword(DEMO_PASSWORD),
      },
    });
  });

  afterAll(async () => {
    await prisma.intake.deleteMany({ where: { organizationId: otherOrgId } });
    await prisma.organization.delete({ where: { id: otherOrgId } });
    await prisma.user.deleteMany({ where: { email: parentEmail } });
    await prisma.$disconnect();
  });

  describe("authenticate", () => {
    it("signs in a staff member with the right password", () => {
      expect(director.role).toBe("director");
      expect(director.organizationId).not.toBeNull();
    });

    it("normalizes the e-mail address", async () => {
      const result = await authenticate(
        { email: "  DEMO-Coach@Example.invalid ", password: DEMO_PASSWORD },
        { prisma, throttle: newThrottle() },
      );
      expect(result.status).toBe("ok");
    });

    it("rejects a wrong password and an unknown e-mail the same way", async () => {
      const deps = { prisma, throttle: newThrottle() };
      const wrong = await authenticate(
        { email: "demo-coach@example.invalid", password: "nope" },
        deps,
      );
      const unknown = await authenticate(
        { email: "nobody@example.invalid", password: DEMO_PASSWORD },
        deps,
      );
      expect(wrong).toEqual({ status: "invalid" });
      expect(unknown).toEqual({ status: "invalid" });
    });

    it("does not let a parent account into the cabinet", async () => {
      const result = await authenticate(
        { email: parentEmail, password: DEMO_PASSWORD },
        { prisma, throttle: newThrottle() },
      );
      expect(result).toEqual({ status: "invalid" });
    });

    it("rejects malformed input", async () => {
      const result = await authenticate(
        { email: "not-an-email", password: "" },
        { prisma, throttle: newThrottle() },
      );
      expect(result).toEqual({ status: "invalid_input" });
    });

    it("throttles repeated failures, even when the password becomes right", async () => {
      const deps = { prisma, throttle: newThrottle() };
      const attempt = (password: string) =>
        authenticate({ email: "demo-coach@example.invalid", password }, deps);
      for (let i = 0; i < 3; i++) await attempt("wrong");
      expect(await attempt("wrong")).toEqual({ status: "throttled" });
      expect(await attempt(DEMO_PASSWORD)).toEqual({ status: "throttled" });
    });
  });

  describe("academy isolation", () => {
    it("returns the user's own intakes only", async () => {
      const intakes = await listIntakesForUser(director, prisma);
      expect(intakes.length).toBeGreaterThan(0);
      expect(
        intakes.every((i) => i.organizationId === director.organizationId),
      ).toBe(true);
      expect(intakes.some((i) => i.id === otherIntakeId)).toBe(false);
    });

    it("includes the number of candidates for each intake", async () => {
      const demo = (await listIntakesForUser(director, prisma)).find(
        (i) => i.name === "Демо-набор 2015",
      );
      expect(demo?._count.candidates).toBe(3);
    });

    it("hides another academy's intake as if it did not exist", async () => {
      expect(
        await findIntakeForUser(director, otherIntakeId, prisma),
      ).toBeNull();
      expect(
        await findIntakeForUser(director, crypto.randomUUID(), prisma),
      ).toBeNull();
    });

    it("finds the user's own intake", async () => {
      const [own] = await listIntakesForUser(director, prisma);
      expect((await findIntakeForUser(director, own.id, prisma))?.id).toBe(
        own.id,
      );
    });

    it("gives nothing to a parent or a user without an academy", async () => {
      const parent = { role: "parent" as const, organizationId: null };
      expect(await listIntakesForUser(parent, prisma)).toEqual([]);
      expect(await findIntakeForUser(parent, otherIntakeId, prisma)).toBeNull();
    });
  });
});
