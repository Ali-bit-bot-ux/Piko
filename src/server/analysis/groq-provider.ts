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
  sampleFrames,
} from "./shared";

const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

/** Groq's vision models take only a few pictures per request. */
export const GROQ_MAX_IMAGES = 5;

const replySchema = z.object({
  choices: z
    .array(
      z.object({
        finish_reason: z.string().nullish(),
        message: z.object({ content: z.string().nullish() }),
      }),
    )
    .min(1),
  usage: z
    .object({
      prompt_tokens: z.number().int().min(0),
      completion_tokens: z.number().int().min(0),
    })
    .optional(),
});

export type GroqProviderOptions = {
  apiKey: string;
  model: string;
  /** Test double for `fetch`. */
  fetchImpl?: typeof fetch;
};

/**
 * Groq (OpenAI-compatible API) over plain HTTP. It is the backup: with many
 * frames it looks at a few of them, spread over the whole video.
 */
export class GroqAnalysisProvider implements AnalysisProvider {
  readonly name = "groq";
  private readonly apiKey: string;
  private readonly model: string;
  private readonly fetchImpl: typeof fetch;

  constructor({ apiKey, model, fetchImpl }: GroqProviderOptions) {
    this.apiKey = apiKey;
    this.model = model;
    this.fetchImpl = fetchImpl ?? fetch;
  }

  async analyze(input: AnalysisInput): Promise<AnalysisResult> {
    assertInputWithinLimits(input);

    const content: Record<string, unknown>[] = [];
    for (const frame of sampleFrames(input.frames, GROQ_MAX_IMAGES)) {
      content.push({ type: "text", text: frameCaption(frame.timeSec) });
      content.push({
        type: "image_url",
        image_url: {
          url: `data:${frame.mimeType};base64,${Buffer.from(frame.data).toString("base64")}`,
        },
      });
    }
    content.push({
      type: "text",
      text: `${criteriaText(input)}\n\n${JSON_SHAPE_PROMPT}`,
    });

    let response: Response;
    try {
      response = await this.fetchImpl(ENDPOINT, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content },
          ],
          response_format: { type: "json_object" },
          max_tokens: MAX_OUTPUT_TOKENS,
          temperature: 0.2,
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      throw networkFailure("Groq", error);
    }
    if (!response.ok) throw httpFailure("Groq", response.status);

    const body = replySchema.safeParse(await response.json().catch(() => null));
    if (!body.success) {
      throw new AnalysisError("Groq answer had an unexpected shape");
    }
    const choice = body.data.choices[0];
    if (choice.finish_reason === "length") {
      throw new AnalysisError("Groq answer was cut off (max_tokens)");
    }
    if (!choice.message.content) throw new AnalysisError("Groq gave no answer");

    return finishResult(parseJsonAnswer(choice.message.content), input, {
      inputTokens: body.data.usage?.prompt_tokens ?? 0,
      outputTokens: body.data.usage?.completion_tokens ?? 0,
    });
  }
}
