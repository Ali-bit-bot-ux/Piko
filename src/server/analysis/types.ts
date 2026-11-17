import { z } from "zod";

/**
 * Upper bound on frames sent in one request (AGENTS.md rule 6: limit cost).
 * Tune in T-041 / T-062 after testing on a real match.
 */
export const MAX_FRAMES_PER_REQUEST = 40;

export type AnalysisFrame = {
  /** Position in the video, seconds from the start. */
  timeSec: number;
  mimeType: "image/jpeg" | "image/png";
  data: Uint8Array;
};

export type AnalysisInput = {
  /** Criterion keys to suggest scores for (see docs/scoring.md). */
  criteria: readonly string[];
  frames: readonly AnalysisFrame[];
  /** Event log text, if available. */
  eventLog?: string;
};

/**
 * What a provider must return. The AI only SUGGESTS scores: the coach
 * confirms or changes them (D-019).
 */
export const analysisResultSchema = z.object({
  suggestions: z.array(
    z.object({
      criterionKey: z.string().min(1),
      score: z.number().int().min(1).max(5),
      comment: z.string().min(1),
    }),
  ),
  summary: z.string().min(1),
  keyMoments: z.array(
    z.object({
      timeSec: z.number().min(0),
      description: z.string().min(1),
    }),
  ),
  usage: z.object({
    inputTokens: z.number().int().min(0),
    outputTokens: z.number().int().min(0),
  }),
});

export type AnalysisResult = z.infer<typeof analysisResultSchema>;

export interface AnalysisProvider {
  readonly name: string;
  analyze(input: AnalysisInput): Promise<AnalysisResult>;
}

export class AnalysisError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalysisError";
  }
}

/** Validates raw provider output. Invalid output is an error, never shown as is. */
export function parseAnalysisResult(raw: unknown): AnalysisResult {
  const parsed = analysisResultSchema.safeParse(raw);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new AnalysisError(`Invalid analysis result: ${details}`);
  }
  return parsed.data;
}

/** Throws when the request is empty-handed or over the frame limit. */
export function assertInputWithinLimits(input: AnalysisInput): void {
  if (input.criteria.length === 0) {
    throw new AnalysisError("At least one criterion is required");
  }
  if (input.frames.length > MAX_FRAMES_PER_REQUEST) {
    throw new AnalysisError(
      `Too many frames: ${input.frames.length} (max ${MAX_FRAMES_PER_REQUEST})`,
    );
  }
}
