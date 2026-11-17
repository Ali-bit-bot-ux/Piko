import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  AnalysisError,
  analysisResultSchema,
  assertInputWithinLimits,
  parseAnalysisResult,
  type AnalysisInput,
  type AnalysisProvider,
  type AnalysisResult,
} from "./types";

/**
 * What the model returns. Token usage is not asked from the model: it comes
 * from the API response, so it cannot be invented.
 */
const modelOutputSchema = analysisResultSchema.omit({ usage: true });

const SYSTEM_PROMPT = [
  "Ты помощник тренера детской футбольной академии. По кадрам видео и журналу событий предложи оценки по заданным критериям.",
  "Шкала 1–5: 1 — не соответствует возрасту, 2 — ниже ожидаемого, 3 — соответствует возрасту, 4 — выше ожидаемого, 5 — существенно выше.",
  "Ты только предлагаешь оценки. Решение принимает тренер, поэтому не делай выводов о зачислении ребёнка.",
  "Оценивай только то, что видно на кадрах или записано в журнале. Если по материалу судить о критерии нельзя, не включай его в ответ.",
  "Пиши по-русски, доброжелательно и конкретно, про действия на поле, а не про личность ребёнка. Комментарий к критерию: одно-два предложения.",
  "Не называй имён. В summary: два-три предложения о том, что получается и над чем поработать.",
  "keyMoments: не больше пяти важных моментов, timeSec берёшь из подписей кадров («Кадр на N с»).",
  "Используй в criterionKey только ключи из списка критериев.",
].join("\n");

const MAX_OUTPUT_TOKENS = 8_000;

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

    // Keep only criteria that were asked for, one suggestion per criterion.
    const asked = new Set(input.criteria);
    const seen = new Set<string>();
    const suggestions = output.suggestions.filter((suggestion) => {
      if (!asked.has(suggestion.criterionKey)) return false;
      if (seen.has(suggestion.criterionKey)) return false;
      seen.add(suggestion.criterionKey);
      return true;
    });

    return parseAnalysisResult({
      ...output,
      suggestions,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    });
  }
}

function buildContent(input: AnalysisInput): Anthropic.ContentBlockParam[] {
  const content: Anthropic.ContentBlockParam[] = [];

  // Each frame gets a caption with its time so the model can cite moments.
  for (const frame of input.frames) {
    content.push({
      type: "text",
      text: `Кадр на ${frame.timeSec.toFixed(1)} с`,
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

  const parts = [`Критерии для оценки (ключи): ${input.criteria.join(", ")}`];
  if (input.eventLog) {
    parts.push(`Журнал событий:\n<event_log>\n${input.eventLog}\n</event_log>`);
  }
  content.push({ type: "text", text: parts.join("\n\n") });
  return content;
}
