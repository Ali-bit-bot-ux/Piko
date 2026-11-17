import { z } from "zod";
import type { PrismaClient } from "@/generated/prisma/client";
import { isStaff, type SessionUser } from "../auth/policy";
import { ConfigError, loadConfig } from "../config";
import { getPrisma } from "../db/client";
import { findIntakeForUser } from "../db/intakes";
import { criterionKeys } from "../scoring";
import { createAnalysisProvider } from "./index";
import {
  MAX_FRAMES_PER_REQUEST,
  type AnalysisProvider,
  type AnalysisResult,
} from "./types";

/** Total size of all frames in one request (AGENTS.md rule 6: limit cost). */
export const MAX_FRAMES_TOTAL_BYTES = 12 * 1024 * 1024;
/** One frame is a downscaled JPEG, far below this. */
export const MAX_FRAME_BYTES = 2 * 1024 * 1024;
/** Sanity bound for a time in the video, seconds. */
const MAX_TIME_SEC = 6 * 60 * 60;

const frameSchema = z.object({
  timeSec: z.number().finite().min(0).max(MAX_TIME_SEC),
  mimeType: z.enum(["image/jpeg", "image/png"]),
  data: z.instanceof(Uint8Array),
});

export const analyzeCandidateSchema = z.object({
  intakeId: z.uuid(),
  candidateId: z.uuid(),
  frames: z.array(frameSchema).min(1).max(MAX_FRAMES_PER_REQUEST),
});

export type AnalyzeCandidateInput = z.input<typeof analyzeCandidateSchema>;

export type AnalyzeCandidateError =
  | "invalid"
  | "too_large"
  | "forbidden"
  | "not_found"
  | "closed"
  | "unavailable"
  | "failed";

export type AnalyzeCandidateResult =
  | {
      ok: true;
      analysisId: string;
      provider: string;
      createdAt: Date;
      result: AnalysisResult;
    }
  | { ok: false; code: AnalyzeCandidateError };

const JPEG_MAGIC = [0xff, 0xd8, 0xff];
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47];

/** The declared type is the sender's word: check the real file signature. */
export function matchesImageSignature(
  mimeType: "image/jpeg" | "image/png",
  data: Uint8Array,
): boolean {
  const magic = mimeType === "image/jpeg" ? JPEG_MAGIC : PNG_MAGIC;
  return magic.every((byte, index) => data[index] === byte);
}

export type AnalyzeCandidateDeps = {
  client?: PrismaClient;
  /** Test double. By default the provider chosen by ANALYSIS_PROVIDER. */
  provider?: AnalysisProvider;
};

/**
 * Asks the analysis provider for score suggestions from video frames and
 * stores only the validated result. Frames of children live in memory for the
 * duration of the request: they are never written to disk, storage or logs.
 * The AI only suggests; the coach decides (D-019). Staff of the intake's own
 * academy, while the intake is open or testing.
 */
export async function analyzeCandidate(
  user: Pick<SessionUser, "id" | "role" | "organizationId">,
  input: unknown,
  deps: AnalyzeCandidateDeps = {},
): Promise<AnalyzeCandidateResult> {
  if (!isStaff(user) || user.organizationId === null) {
    return { ok: false, code: "forbidden" };
  }

  const parsed = analyzeCandidateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid" };
  const { intakeId, candidateId, frames } = parsed.data;

  let total = 0;
  for (const frame of frames) {
    if (frame.data.byteLength === 0) return { ok: false, code: "invalid" };
    if (frame.data.byteLength > MAX_FRAME_BYTES) {
      return { ok: false, code: "too_large" };
    }
    if (!matchesImageSignature(frame.mimeType, frame.data)) {
      return { ok: false, code: "invalid" };
    }
    total += frame.data.byteLength;
  }
  if (total > MAX_FRAMES_TOTAL_BYTES) return { ok: false, code: "too_large" };

  const prisma = deps.client ?? getPrisma();

  // Another academy's intake looks exactly like a missing one.
  const intake = await findIntakeForUser(user, intakeId, prisma);
  if (!intake) return { ok: false, code: "not_found" };
  const candidate = await prisma.candidate.findFirst({
    where: { id: candidateId, intakeId: intake.id },
    select: { id: true },
  });
  if (!candidate) return { ok: false, code: "not_found" };
  if (intake.status !== "open" && intake.status !== "testing") {
    return { ok: false, code: "closed" };
  }

  let result: AnalysisResult;
  let providerName: string;
  try {
    const provider = deps.provider ?? createAnalysisProvider(loadConfig());
    providerName = provider.name;
    result = await provider.analyze({
      criteria: criterionKeys(intake.ageProfile),
      frames,
    });
  } catch (error) {
    // Only the error class is logged: messages could echo model output.
    console.error(
      "analysis failed:",
      error instanceof Error ? error.name : "unknown",
    );
    return {
      ok: false,
      code: error instanceof ConfigError ? "unavailable" : "failed",
    };
  }

  const saved = await prisma.analysis.create({
    data: {
      candidateId: candidate.id,
      source: "video",
      provider: providerName,
      result,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
    },
    select: { id: true, createdAt: true },
  });
  return {
    ok: true,
    analysisId: saved.id,
    provider: providerName,
    createdAt: saved.createdAt,
    result,
  };
}
