// Integration tests against the real local Postgres. Skipped without DATABASE_URL.
import { config } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { purgeEventsForTests } from "../../../tests/helpers/events";
import { getPrisma } from "../db/client";
import { listEvents } from "../events";
import { createReport } from "./create-report";
import { getReportPanelForUser, markReportSent } from "./manage-report";
import { openReport } from "./open-report";
import { hashReportToken } from "./token";

config({ path: [".env.local", ".env"], quiet: true });

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("parent reports (database)", () => {
  let prisma: PrismaClient;
  let orgId: string;
  let otherOrgId: string;
  let intakeId: string;
  let otherIntakeId: string;
  let scoredId: string;
  let unscoredId: string;
  let otherChildId: string;

  const staff = (
    role: "admin" | "director" | "coach",
    organizationId = orgId,
  ) => ({
    id: crypto.randomUUID(),
    role,
    organizationId,
  });
  const target = (overrides: Record<string, unknown> = {}) => ({
    intakeId,
    candidateId: scoredId,
    ...overrides,
  });
  const makeChild = async (id: string, fullName: string) =>
    (
      await prisma.candidate.create({
        data: {
          intakeId: id,
          fullName,
          birthDate: new Date("2015-05-05"),
          parentName: "Родитель Отчёта",
          parentContact: "parent@example.invalid",
          consentGrantedAt: new Date(),
          consentVersion: "test",
        },
      })
    ).id;

  beforeAll(async () => {
    prisma = getPrisma();
    orgId = (
      await prisma.organization.create({ data: { name: "Акад. отчётов А" } })
    ).id;
    otherOrgId = (
      await prisma.organization.create({ data: { name: "Акад. отчётов Б" } })
    ).id;
    const makeIntake = async (organizationId: string) =>
      (
        await prisma.intake.create({
          data: {
            organizationId,
            name: "Тест отчётов",
            birthYear: 2015,
            ageProfile: "U10_U11",
            tryoutDate: new Date("2026-12-01"),
            status: "open",
          },
        })
      ).id;
    intakeId = await makeIntake(orgId);
    otherIntakeId = await makeIntake(otherOrgId);
    scoredId = await makeChild(intakeId, "Тимур Отчётный");
    unscoredId = await makeChild(intakeId, "Без Оценки");
    otherChildId = await makeChild(otherIntakeId, "Чужой Ребёнок");

    const breakdown = {
      criteria: [
        { key: "ball_control", weight: 20, score: 5, ratings: [5] },
        { key: "passing", weight: 20, score: 2, ratings: [2] },
        { key: "speed_agility", weight: 15, score: 3, ratings: [3] },
      ],
    };
    await prisma.score.create({
      data: {
        candidateId: scoredId,
        total: 3.75,
        breakdown,
        decision: "reserve",
      },
    });
  });

  afterAll(async () => {
    if (!prisma) return;
    await purgeEventsForTests(prisma, orgId);
    // Candidates, scores and reports go with their intakes.
    await prisma.intake.deleteMany({
      where: { organizationId: { in: [orgId, otherOrgId] } },
    });
    await prisma.organization.deleteMany({
      where: { id: { in: [orgId, otherOrgId] } },
    });
  });

  it("creates a link only for admin and director of the own academy", async () => {
    const coach = await createReport(staff("coach"), target(), prisma);
    expect(coach).toEqual({ ok: false, code: "forbidden" });

    const outsider = await createReport(
      staff("admin", otherOrgId),
      target(),
      prisma,
    );
    expect(outsider).toEqual({ ok: false, code: "not_found" });

    expect(
      await createReport(staff("admin"), { intakeId: "x" }, prisma),
    ).toEqual({ ok: false, code: "invalid" });
    expect(
      await createReport(
        staff("admin"),
        target({ candidateId: otherChildId }),
        prisma,
      ),
    ).toEqual({ ok: false, code: "not_found" });
    expect(
      await createReport(
        staff("admin"),
        target({ candidateId: unscoredId }),
        prisma,
      ),
    ).toEqual({ ok: false, code: "no_score" });
  });

  it("stores only the hash, and a new link replaces the old one", async () => {
    const admin = staff("admin");
    const first = await createReport(admin, target(), prisma);
    if (!first.ok) throw new Error("expected a link");
    const row = await prisma.report.findUniqueOrThrow({
      where: { candidateId: scoredId },
    });
    expect(row.tokenHash).toBe(hashReportToken(first.token));
    expect(JSON.stringify(row)).not.toContain(first.token);

    const second = await createReport(staff("director"), target(), prisma);
    if (!second.ok) throw new Error("expected a link");
    expect(second.token).not.toBe(first.token);
    expect(await openReport(first.token, prisma)).toEqual({ ok: false });
    expect((await openReport(second.token, prisma)).ok).toBe(true);
  });

  it("opens a report without personal data of others and journals the first open once", async () => {
    const created = await createReport(staff("admin"), target(), prisma);
    if (!created.ok) throw new Error("expected a link");
    const before = (
      await listEvents(
        { organizationId: orgId, participantId: scoredId },
        prisma,
      )
    ).filter((e) => e.type === "report_opened").length;

    const opened = await openReport(created.token, prisma);
    if (!opened.ok) throw new Error("expected a report");
    expect(opened.report.childName).toBe("Тимур Отчётный");
    expect(opened.report.total).toBe(3.75);
    expect(opened.report.decision).toBe("reserve");
    expect(opened.report.criteria.map((c) => c.key)).toEqual([
      "ball_control",
      "passing",
      "speed_agility",
    ]);
    expect(opened.report.strengths).toEqual(["ball_control"]);
    expect(opened.report.growth).toEqual(["passing"]);
    expect(JSON.stringify(opened.report)).not.toContain("Родитель Отчёта");

    await openReport(created.token, prisma);
    const events = (
      await listEvents(
        { organizationId: orgId, participantId: scoredId },
        prisma,
      )
    ).filter((e) => e.type === "report_opened");
    expect(events.length - before).toBe(1);
    expect(events.at(-1)?.actorRole).toBe("parent");
    expect(events.at(-1)?.actorId).toBeNull();
    expect(JSON.stringify(events.at(-1)?.payload)).not.toContain("Тимур");

    const row = await prisma.report.findUniqueOrThrow({
      where: { candidateId: scoredId },
    });
    expect(row.openedAt).not.toBeNull();
  });

  it("treats wrong, malformed and expired links the same way", async () => {
    const created = await createReport(staff("admin"), target(), prisma);
    if (!created.ok) throw new Error("expected a link");
    const wrong = await openReport("A".repeat(43), prisma);
    const malformed = await openReport("nope", prisma);
    const later = new Date(created.expiresAt.getTime() + 1000);
    const expired = await openReport(created.token, prisma, later);
    expect(wrong).toEqual({ ok: false });
    expect(malformed).toEqual({ ok: false });
    expect(expired).toEqual({ ok: false });
  });

  it("shows the panel only to admin and director of the own academy", async () => {
    expect(
      await getReportPanelForUser(staff("coach"), target(), prisma),
    ).toBeNull();
    expect(
      await getReportPanelForUser(staff("admin", otherOrgId), target(), prisma),
    ).toBeNull();
    const own = await getReportPanelForUser(staff("admin"), target(), prisma);
    expect(own?.canCreate).toBe(true);
    const unscored = await getReportPanelForUser(
      staff("admin"),
      target({ candidateId: unscoredId }),
      prisma,
    );
    expect(unscored).toEqual({ canCreate: false, report: null });
  });

  it("marks a report as sent once and journals report_sent", async () => {
    const admin = staff("admin");
    const send = (user = admin, channel = "whatsapp") =>
      markReportSent(user, { ...target(), channel }, prisma);

    expect(await send(staff("coach"))).toEqual({
      ok: false,
      code: "forbidden",
    });
    expect(await send(staff("admin", otherOrgId))).toEqual({
      ok: false,
      code: "not_found",
    });
    expect(await send(admin, "pigeon")).toEqual({ ok: false, code: "invalid" });

    await createReport(admin, target(), prisma);
    const first = await send();
    const again = await send();
    expect(first).toEqual({ ok: true, alreadySent: false });
    expect(again).toEqual({ ok: true, alreadySent: true });

    const sentEvents = (
      await listEvents(
        { organizationId: orgId, participantId: scoredId },
        prisma,
      )
    ).filter((e) => e.type === "report_sent");
    expect(sentEvents.length).toBeGreaterThanOrEqual(1);
    const last = sentEvents.at(-1);
    expect(last?.actorRole).toBe("admin");
    expect(last?.payload).toMatchObject({ channel: "whatsapp" });

    const panel = await getReportPanelForUser(admin, target(), prisma);
    expect(panel?.report?.sentAt).not.toBeNull();

    // A new link starts the statuses over.
    await createReport(admin, target(), prisma);
    const reset = await getReportPanelForUser(admin, target(), prisma);
    expect(reset?.report?.sentAt).toBeNull();
    expect(reset?.report?.openedAt).toBeNull();
  });

  it("reports nothing for a child without a report", async () => {
    const result = await markReportSent(
      staff("admin"),
      { ...target({ candidateId: unscoredId }), channel: "manual" },
      prisma,
    );
    expect(result).toEqual({ ok: false, code: "not_found" });
  });
});
