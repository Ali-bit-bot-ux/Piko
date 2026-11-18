import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  MAX_OUTPUT_TOKENS,
  SYSTEM_PROMPT,
  criteriaText,
  finishResult,
  frameCaption,
  modelOutputSchema,
} from "./shared";
import {
  AnalysisError,
  assertInputWithinLimits,
  type AnalysisInput,
  type AnalysisProvider,
  type AnalysisResult,
} from "./types";

/** The slice of the Anthropic client this provider uses (replaceable in tests). */
export type ClaudeClient = Pick<Anthropic, "messages">;

export type ClaudeProviderOptions = {
  apiKey?: string;
  model: string;
  /** Test double. Without it a real client is built from the API key. */
  client?: ClaudeClient;
};

export class ClaudeAnalysisProvider implements AnalysisProvider {
  readonly name = "claude";
  private readonly client: ClaudeClient;
  private readonly model: string;

  constructor({ apiKey, model, client }: ClaudeProviderOptions) {
    this.model = model;
    this.client =
      client ?? new Anthropic({ apiKey, timeout: 120_000, maxRetries: 2 });
  }

  async analyze(input: AnalysisInput): Promise<AnalysisResult> {
    assertInputWithinLimits(input);

    let response;
    try {
      response = await this.client.messages.parse({
        model: this.model,
        max_tokens: MAX_OUTPUT_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildContent(input) }],
        output_config: { format: zodOutputFormat(modelOutputSchema) },
      });
    } catch (error) {
      // Never put the response body or the request in the message: they hold
      // frames of children and may hold text from the journal.
      if (error instanceof Anthropic.APIError) {
        throw new AnalysisError(`Claude request failed (HTTP ${error.status})`);
      }
      throw new AnalysisError(
        `Claude request failed (${error instanceof Error ? error.name : "unknown error"})`,
      );
    }

    if (response.stop_reason === "refusal") {
      throw new AnalysisError("Claude declined to analyse this material");
    }
    if (response.stop_reason === "max_tokens") {
      throw new AnalysisError("Claude answer was cut off (max_tokens)");
    }
    const output = response.parsed_output;
    if (!output) {
      throw new AnalysisError(
        "Claude answer did not match the expected format",
      );
    }

    return finishResult(output, input, {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    });
  }
}

function buildContent(input: AnalysisInput): Anthropic.ContentBlockParam[] {
  const content: Anthropic.ContentBlockParam[] = [];

  // Each frame gets a caption with its time so the model can cite moments.
  for (const frame of input.frames) {
    content.push({
      type: "text",
      text: frameCaption(frame.timeSec),
    });
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: frame.mimeType,
        data: Buffer.from(frame.data).toString("base64"),
      },
    });
  }

  content.push({ type: "text", text: criteriaText(input) });
  return content;
}
