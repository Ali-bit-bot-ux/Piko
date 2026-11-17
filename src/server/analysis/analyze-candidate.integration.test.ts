// Integration tests against the real local Postgres. Skipped without DATABASE_URL.
import { config } from "dotenv";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { getLatestAnalysisForUser } from "../db/analyses";
import { criterionKeys } from "../scoring";
import { MAX_FRAMES_TOTAL_BYTES, analyzeCandidate } from "./analyze-candidate";
import { StubAnalysisProvider } from "./stub-provider";
import {
  AnalysisError,
  MAX_FRAMES_PER_REQUEST,
  type AnalysisProvider,
} from "./types";

config({ path: [".env.local", ".env"], quiet: true });

const hasDatabase = Boolean(process.env.DATABASE_URL);

const jpeg = (size = 16) => {
  const data = new Uint8Array(size);
  data.set([0xff, 0xd8, 0xff]);
  return data;
};
const frame = (timeSec: number, data = jpeg()) => ({
  timeSec,
  mimeType: "image/jpeg" as const,
  data,
});

describe.skipIf(!hasDatabase)("analyzeCandidate (database)", () => {
  let prisma: PrismaClient;
  let orgId: string;
  let otherOrgId: string;
  let intakeId: string;
  let finishedIntakeId: string;
  let otherIntakeId: string;
  let childId: string;
  let finishedChildId: string;
  let otherChildId: string;
  let coachId: string;
  let outsiderId: string;

  const user = (id: string, organizationId = orgId) => ({
    id,
    role: "coach" as const,
    organizationId,
  });
  const input = (overrides: Record<string, unknown> = {}) => ({
    intakeId,
    candidateId: childId,
    frames: [frame(1), frame(5)],
    ...overrides,
  });
  const run = (
    u: Parameters<typeof analyzeCandidate>[0],
    i: unknown,
    provider?: AnalysisProvider,
  ) =>
    analyzeCandidate(u, i, {
      client: prisma,
      provider: provider ?? new StubAnalysisProvider(),
    });

  const makeUser = async (organizationId: string) =>
    (
      await prisma.user.create({
        data: {
          email: `coach-${crypto.randomUUID()}@example.invalid`,
          name: "Тест Тренер видео",
          role: "coach",
          organizationId,
        },
      })
    ).id;
  const makeIntake = (organizationId: string, status: "open" | "finished") =>
    prisma.intake.create({
      data: {
        organizationId,
        name: "Тест видео-анализа",
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
          fullName: "Игорь Видеоанализ",
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
      await prisma.organization.create({ data: { name: "Тест: видео" } })
    ).id;
    otherOrgId = (
      await prisma.organization.create({ data: { name: "Тест: чужая видео" } })
    ).id;
    coachId = await makeUser(orgId);
    outsiderId = await makeUser(otherOrgId);
    intakeId = (await makeIntake(orgId, "open")).id;
    finishedIntakeId = (await makeIntake(orgId, "finished")).id;
    otherIntakeId = (await makeIntake(otherOrgId, "open")).id;
    childId = await makeChild(intakeId);
    finishedChildId = await makeChild(finishedIntakeId);
    otherChildId = await makeChild(otherIntakeId);
  });

  afterAll(async () => {
    await prisma.intake.deleteMany({
      where: { id: { in: [intakeId, finishedIntakeId, otherIntakeId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [coachId, outsiderId] } },
    });
    await prisma.organization.deleteMany({
      where: { id: { in: [orgId, otherOrgId] } },
    });
    await prisma.$disconnect();
  });

  it("stores only the validated result for the criteria of the intake profile", async () => {
    const result = await run(user(coachId), input());
    if (!result.ok) throw new Error(`unexpected ${result.code}`);
    expect(result.provider).toBe("stub");
    expect(result.result.suggestions.map((s) => s.criterionKey)).toEqual(
      criterionKeys("U10_U11"),
    );

    const rows = await prisma.analysis.findMany({
      where: { candidateId: childId },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      source: "video",
      provider: "stub",
      inputTokens: 0,
      outputTokens: 0,
    });
    // The stored JSON holds no frame data, only the result.
    expect(Object.keys(rows[0].result as object).sort()).toEqual([
      "keyMoments",
      "suggestions",
      "summary",
      "usage",
    ]);

    const latest = await getLatestAnalysisForUser(
      user(coachId),
      intakeId,
      childId,
      prisma,
    );
    expect(latest?.id).toBe(result.analysisId);
    expect(latest?.result.summary).toBe(result.result.summary);
  });

  it("does not show the analysis to another academy", async () => {
    expect(
      await getLatestAnalysisForUser(
        user(outsiderId, otherOrgId),
        intakeId,
        childId,
        prisma,
      ),
    ).toBeNull();
  });

  it("rejects bad input and over-limit frames without saving anything", async () => {
    const before = await prisma.analysis.count({
      where: { candidateId: childId },
    });
    const tooMany = Array.from({ length: MAX_FRAMES_PER_REQUEST + 1 }, (_, i) =>
      frame(i),
    );
    expect(await run(user(coachId), input({ frames: tooMany }))).toEqual({
      ok: false,
      code: "invalid",
    });
    expect(await run(user(coachId), input({ frames: [] }))).toEqual({
      ok: false,
      code: "invalid",
    });
    expect(
      await run(
        user(coachId),
        input({ frames: [frame(1, new Uint8Array(9))] }),
      ),
    ).toEqual({ ok: false, code: "invalid" });
    expect(await run(user(coachId), input({ intakeId: "nope" }))).toEqual({
      ok: false,
      code: "invalid",
    });
    const big = jpeg(Math.ceil(MAX_FRAMES_TOTAL_BYTES / 7));
    expect(
      await run(
        user(coachId),
        input({ frames: Array.from({ length: 8 }, (_, i) => frame(i, big)) }),
      ),
    ).toEqual({ ok: false, code: "too_large" });
    expect(
      await prisma.analysis.count({ where: { candidateId: childId } }),
    ).toBe(before);
  });

  it("refuses other academies, foreign children, closed intakes and non-staff", async () => {
    expect(await run(user(outsiderId, otherOrgId), input())).toEqual({
      ok: false,
      code: "not_found",
    });
    expect(
      await run(user(coachId), input({ candidateId: otherChildId })),
    ).toEqual({ ok: false, code: "not_found" });
    expect(
      await run(
        user(coachId),
        input({ intakeId: finishedIntakeId, candidateId: finishedChildId }),
      ),
    ).toEqual({ ok: false, code: "closed" });
    for (const forbidden of [
      { id: "u", role: "parent" as const, organizationId: null },
      { id: "u", role: "coach" as const, organizationId: null },
    ]) {
      expect(await run(forbidden, input())).toEqual({
        ok: false,
        code: "forbidden",
      });
    }
  });

  it("turns provider errors into codes without the provider text", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const failing = {
      name: "claude",
      analyze: async () => {
        throw new AnalysisError("secret model text about a child");
      },
    };
    const result = await run(user(coachId), input(), failing);
    expect(result).toEqual({ ok: false, code: "failed" });
    expect(JSON.stringify(log.mock.calls)).not.toContain("secret");
    log.mockRestore();
    expect(
      await prisma.analysis.count({
        where: { provider: "claude", candidateId: childId },
      }),
    ).toBe(0);
  });
});
