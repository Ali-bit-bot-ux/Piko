import { z } from "zod";
import {
  AnalysisError,
  assertInputWithinLimits,
  type AnalysisInput,
  type AnalysisProvider,
  type AnalysisResult,
} from "./types";
import {
  JSON_SHAPE_PROMPT,
  MAX_OUTPUT_TOKENS,
  REQUEST_TIMEOUT_MS,
  SYSTEM_PROMPT,
  criteriaText,
  finishResult,
  frameCaption,
  httpFailure,
  networkFailure,
  parseJsonAnswer,
} from "./shared";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

/** The part of a Gemini reply this provider reads. */
const replySchema = z.object({
  candidates: z
    .array(
      z.object({
        finishReason: z.string().optional(),
        content: z
          .object({ parts: z.array(z.object({ text: z.string().optional() })) })
          .optional(),
      }),
    )
    .optional(),
  usageMetadata: z
    .object({
      promptTokenCount: z.number().int().min(0).optional(),
      candidatesTokenCount: z.number().int().min(0).optional(),
    })
    .optional(),
});

export type GeminiProviderOptions = {
  apiKey: string;
  model: string;
  /** Test double for `fetch`. */
  fetchImpl?: typeof fetch;
};

/**
 * Gemini over plain HTTP (no SDK). The key travels in a header, never in the
 * address, so it does not end up in logs.
 */
export class GeminiAnalysisProvider implements AnalysisProvider {
  readonly name = "gemini";
  private readonly apiKey: string;
  private readonly model: string;
  private readonly fetchImpl: typeof fetch;

  constructor({ apiKey, model, fetchImpl }: GeminiProviderOptions) {
    this.apiKey = apiKey;
    this.model = model;
    this.fetchImpl = fetchImpl ?? fetch;
  }

  async analyze(input: AnalysisInput): Promise<AnalysisResult> {
    assertInputWithinLimits(input);

    const parts: Record<string, unknown>[] = [];
    for (const frame of input.frames) {
      parts.push({ text: frameCaption(frame.timeSec) });
      parts.push({
        inlineData: {
          mimeType: frame.mimeType,
          data: Buffer.from(frame.data).toString("base64"),
        },
      });
    }
    parts.push({ text: `${criteriaText(input)}\n\n${JSON_SHAPE_PROMPT}` });

    let response: Response;
    try {
      response = await this.fetchImpl(
        `${ENDPOINT}/${encodeURIComponent(this.model)}:generateContent`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-goog-api-key": this.apiKey,
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [{ role: "user", parts }],
            generationConfig: {
              responseMimeType: "application/json",
              maxOutputTokens: MAX_OUTPUT_TOKENS,
              temperature: 0.2,
            },
          }),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        },
      );
    } catch (error) {
      throw networkFailure("Gemini", error);
    }
    if (!response.ok) throw httpFailure("Gemini", response.status);

    const body = replySchema.safeParse(await response.json().catch(() => null));
    if (!body.success) {
      throw new AnalysisError("Gemini answer had an unexpected shape");
    }
    const candidate = body.data.candidates?.[0];
    if (candidate?.finishReason === "MAX_TOKENS") {
      throw new AnalysisError("Gemini answer was cut off (max_tokens)");
    }
    const text = candidate?.content?.parts
      .map((part) => part.text ?? "")
      .join("");
    if (!text) {
      // Usually a safety block: no text comes back.
      throw new AnalysisError(
        `Gemini gave no answer${candidate?.finishReason ? ` (${candidate.finishReason})` : ""}`,
      );
    }

    return finishResult(parseJsonAnswer(text), input, {
      inputTokens: body.data.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: body.data.usageMetadata?.candidatesTokenCount ?? 0,
    });
  }
}
