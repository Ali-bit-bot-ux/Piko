// Integration tests against the real local Postgres. Skipped without DATABASE_URL.
import { config } from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { purgeEventsForTests } from "../../../tests/helpers/events";
import { getCandidateResultForUser } from "../db/candidate-results";
import { listEvents } from "../events";
import { criterionKeys } from "../scoring";
import { scoreCriterion } from "./score-criterion";

config({ path: [".env.local", ".env"], quiet: true });

const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("coach evaluations (database)", () => {
  let prisma: PrismaClient;
  let orgId: string;
  let otherOrgId: string;
  let intakeId: string;
  let finishedIntakeId: string;
  let otherIntakeId: string;
  let childId: string;
  let child2Id: string;
  let finishedChildId: string;
  let coachA: string;
  let coachB: string;
  let outsiderId: string;

  const user = (id: string, organizationId = orgId) => ({
    id,
    role: "coach" as const,
    organizationId,
  });
  const input = (overrides: Record<string, unknown> = {}) => ({
    intakeId,
    candidateId: childId,
    criterionKey: "ball_control",
    score: 4,
    clientEventId: crypto.randomUUID(),
    ...overrides,
  });

  const makeUser = async (organizationId: string, name: string) =>
    (
      await prisma.user.create({
        data: {
          email: `coach-${crypto.randomUUID()}@example.invalid`,
          name,
          role: "coach",
          organizationId,
        },
      })
    ).id;
  const makeIntake = (organizationId: string, status: "open" | "finished") =>
    prisma.intake.create({
      data: {
        organizationId,
        name: "Тест оценок",
        birthYear: 2015,
        ageProfile: "U10_U11",
        tryoutDate: new Date("2026-12-01"),
        status,
      },
    });
  const makeChild = async (id: string) =>
    (
      await prisma.candidate.create({
        data: {
          intakeId: id,
          fullName: "Игорь Оценённый",
          birthDate: new Date("2015-05-05"),
          parentName: "Родитель",
          parentContact: "parent@example.invalid",
          consentGrantedAt: new Date(),
          consentVersion: "test",
        },
      })
    ).id;

  /** Rates the criteria of the U10-U11 profile for one coach. */
  const rateAll = async (
    coach: string,
    candidateId: string,
    scores: Record<string, number>,
  ) => {
    for (const [criterionKey, score] of Object.entries(scores)) {
      const result = await scoreCriterion(
        user(coach),
        input({ candidateId, criterionKey, score }),
        prisma,
      );
      expect(result.ok).toBe(true);
    }
  };

  beforeAll(async () => {
    prisma = (await import("../db/client")).getPrisma();
    orgId = (
      await prisma.organization.create({ data: { name: "Тест: оценки" } })
    ).id;
    otherOrgId = (
      await prisma.organization.create({ data: { name: "Тест: чужая 3" } })
    ).id;
    coachA = await makeUser(orgId, "Тест Тренер А");
    coachB = await makeUser(orgId, "Тест Тренер Б");
    outsiderId = await makeUser(otherOrgId, "Тест Чужой");
    intakeId = (await makeIntake(orgId, "open")).id;
    finishedIntakeId = (await makeIntake(orgId, "finished")).id;
    otherIntakeId = (await makeIntake(otherOrgId, "open")).id;
    childId = await makeChild(intakeId);
    child2Id = await makeChild(intakeId);
    finishedChildId = await makeChild(finishedIntakeId);
  });

  afterAll(async () => {
    await purgeEventsForTests(prisma, orgId);
    await prisma.intake.deleteMany({
      where: { id: { in: [intakeId, finishedIntakeId, otherIntakeId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [coachA, coachB, outsiderId] } },
    });
    await prisma.organization.deleteMany({
      where: { id: { in: [orgId, otherOrgId] } },
    });
    await prisma.$disconnect();
  });

  it("saves one rating, journals it without personal data and has no total yet", async () => {
    const eventId = crypto.randomUUID();
    expect(
      await scoreCriterion(
        user(coachA),
        input({ clientEventId: eventId }),
        prisma,
      ),
    ).toEqual({ ok: true, duplicate: false, complete: false });

    const saved = await prisma.evaluation.findFirstOrThrow({
      where: { candidateId: childId },
    });
    expect(saved).toMatchObject({
      criterionKey: "ball_control",
      score: 4,
      coachId: coachA,
    });
    expect(await prisma.score.count({ where: { candidateId: childId } })).toBe(
      0,
    );

    const events = await listEvents(
      { organizationId: orgId, intakeId, participantId: childId },
      prisma,
    );
    const scored = events.find((e) => e.type === "evaluation_scored")!;
    expect(scored.id).toBe(eventId);
    expect(scored.payload).toEqual({
      criterionKey: "ball_control",
      score: 4,
      previousScore: null,
    });
    expect(JSON.stringify(events)).not.toContain("Игорь");
  });

  it("changing a rating replaces it (one per coach and criterion) and journals the old one", async () => {
    expect(
      await scoreCriterion(user(coachA), input({ score: 2 }), prisma),
    ).toMatchObject({ ok: true, duplicate: false });
    const rows = await prisma.evaluation.findMany({
      where: { candidateId: childId, criterionKey: "ball_control" },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].score).toBe(2);

    const events = await listEvents(
      { organizationId: orgId, intakeId, participantId: childId },
      prisma,
    );
    const last = events.filter((e) => e.type === "evaluation_scored").at(-1)!;
    expect(last.payload).toMatchObject({ score: 2, previousScore: 4 });
  });

  it("is idempotent and ignores the same rating sent again", async () => {
    const same = input({ score: 5, clientEventId: crypto.randomUUID() });
    expect(await scoreCriterion(user(coachA), same, prisma)).toMatchObject({
      duplicate: false,
    });
    expect(await scoreCriterion(user(coachA), same, prisma)).toMatchObject({
      duplicate: true,
    });
    // Same value, new id: no new event.
    const before = await prisma.event.count({
      where: { organizationId: orgId, participantId: childId },
    });
    expect(
      await scoreCriterion(user(coachA), input({ score: 5 }), prisma),
    ).toMatchObject({ ok: true, duplicate: true });
    expect(
      await prisma.event.count({
        where: { organizationId: orgId, participantId: childId },
      }),
    ).toBe(before);
  });

  it("writes the Score and marks the child evaluated once every criterion is rated (docs example: 3.75, reserve)", async () => {
    await rateAll(coachA, child2Id, {
      ball_control: 4,
      passing: 3,
      speed_agility: 4,
      game_thinking: 3,
      learnability: 4,
    });
    expect(await prisma.score.count({ where: { candidateId: child2Id } })).toBe(
      0,
    );
    expect(
      (await prisma.candidate.findUniqueOrThrow({ where: { id: child2Id } }))
        .status,
    ).toBe("registered");

    expect(
      await scoreCriterion(
        user(coachA),
        input({ candidateId: child2Id, criterionKey: "attitude", score: 5 }),
        prisma,
      ),
    ).toEqual({ ok: true, duplicate: false, complete: true });

    const score = await prisma.score.findUniqueOrThrow({
      where: { candidateId: child2Id },
    });
    expect(Number(score.total)).toBe(3.75);
    expect(score.decision).toBe("reserve");
    expect(score.breakdown).toMatchObject({
      strongDisagreement: false,
      hasLowCriterion: false,
    });
    expect(
      (await prisma.candidate.findUniqueOrThrow({ where: { id: child2Id } }))
        .status,
    ).toBe("evaluated");
  });

  it("uses the median of several coaches and flags a strong disagreement", async () => {
    // coach B disagrees on passing: 3 (A) vs 5 (B) -> spread 2 -> review.
    expect(
      await scoreCriterion(
        user(coachB),
        input({ candidateId: child2Id, criterionKey: "passing", score: 5 }),
        prisma,
      ),
    ).toMatchObject({ ok: true, complete: true });
    const score = await prisma.score.findUniqueOrThrow({
      where: { candidateId: child2Id },
    });
    // passing median (3+5)/2 = 4 -> total 3.75 + 0.2 = 3.95
    expect(Number(score.total)).toBe(3.95);
    expect(score.decision).toBe("review");
    expect(score.breakdown).toMatchObject({ strongDisagreement: true });
  });

  it("builds the result page data for staff of the academy only", async () => {
    const view = await getCandidateResultForUser(
      user(coachB),
      intakeId,
      child2Id,
      prisma,
    );
    expect(view).not.toBeNull();
    expect(view!.criteria.map((c) => c.key)).toEqual(criterionKeys("U10_U11"));
    const passing = view!.criteria.find((c) => c.key === "passing")!;
    expect(passing.mine).toBe(5);
    expect(passing.ratings).toEqual([3, 5]);
    expect(view!.score?.total).toBe(3.95);
    expect(view!.score?.decision).toBe("review");
    expect(view!.canScore).toBe(true);

    expect(
      await getCandidateResultForUser(
        user(outsiderId, otherOrgId),
        intakeId,
        child2Id,
        prisma,
      ),
    ).toBeNull();
    // The child is in another intake of the same academy.
    expect(
      await getCandidateResultForUser(
        user(coachA),
        finishedIntakeId,
        child2Id,
        prisma,
      ),
    ).toBeNull();
    expect(
      await getCandidateResultForUser(
        { id: "p", role: "parent", organizationId: null },
        intakeId,
        child2Id,
        prisma,
      ),
    ).toBeNull();
    const finished = await getCandidateResultForUser(
      user(coachA),
      finishedIntakeId,
      finishedChildId,
      prisma,
    );
    expect(finished!.canScore).toBe(false);
  });

  it("shows the age-norm hint next to a result (age 11 on the tryout day)", async () => {
    const sprint = await prisma.trial.create({
      data: { intakeId, type: "sprint_30m" },
    });
    const shooting = await prisma.trial.create({
      data: { intakeId, type: "shooting" },
    });
    await prisma.measurement.createMany({
      data: [
        { candidateId: child2Id, trialId: sprint.id, attempt: 1, value: 5.7 },
        { candidateId: child2Id, trialId: sprint.id, attempt: 2, value: 5.5 },
        { candidateId: child2Id, trialId: shooting.id, attempt: 1, value: 5 },
      ],
    });
    const view = await getCandidateResultForUser(
      user(coachA),
      intakeId,
      child2Id,
      prisma,
    );
    const byType = Object.fromEntries(view!.trials.map((t) => [t.type, t]));
    // Best of two, 5.5 s at age 11 is a 4, from the documented table.
    expect(byType.sprint_30m.best).toBe(5.5);
    expect(byType.sprint_30m.norm).toEqual({ score: 4, approximate: false });
    // 5 hits of 10 at age 11 is a 4 from the approximate table.
    expect(byType.shooting.norm).toEqual({ score: 4, approximate: true });
  });

  it("rejects a key outside the profile and ratings outside 1..5", async () => {
    for (const overrides of [
      { criterionKey: "tactics" },
      { criterionKey: "nope" },
      { score: 0 },
      { score: 6 },
      { score: 3.5 },
      { candidateId: "x" },
    ]) {
      expect(
        await scoreCriterion(user(coachA), input(overrides), prisma),
      ).toEqual({ ok: false, code: "invalid" });
    }
  });

  it("treats another academy's intake and a child from another intake as not found", async () => {
    expect(
      await scoreCriterion(user(outsiderId, otherOrgId), input(), prisma),
    ).toEqual({ ok: false, code: "not_found" });
    expect(
      await scoreCriterion(
        user(coachA),
        input({ candidateId: finishedChildId }),
        prisma,
      ),
    ).toEqual({ ok: false, code: "not_found" });
    expect(
      await scoreCriterion(
        user(coachA),
        input({ candidateId: crypto.randomUUID() }),
        prisma,
      ),
    ).toEqual({ ok: false, code: "not_found" });
    expect(
      await scoreCriterion(
        user(coachA),
        input({ intakeId: otherIntakeId }),
        prisma,
      ),
    ).toEqual({ ok: false, code: "not_found" });
  });

  it("refuses when the intake is finished, and a parent or a user without an academy", async () => {
    expect(
      await scoreCriterion(
        user(coachA),
        input({ intakeId: finishedIntakeId, candidateId: finishedChildId }),
        prisma,
      ),
    ).toEqual({ ok: false, code: "closed" });
    for (const forbidden of [
      { id: "u", role: "parent" as const, organizationId: null },
      { id: "u", role: "coach" as const, organizationId: null },
    ]) {
      expect(await scoreCriterion(forbidden, input(), prisma)).toEqual({
        ok: false,
        code: "forbidden",
      });
    }
  });
});
