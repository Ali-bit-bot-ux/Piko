// Pieces every model provider uses: the instructions, the JSON answer shape
// and the clean-up of what the model returned.
import {
  AnalysisError,
  analysisResultSchema,
  parseAnalysisResult,
  type AnalysisInput,
  type AnalysisResult,
} from "./types";

/**
 * What the model returns. Token usage is not asked from the model: it comes
 * from the API response, so it cannot be invented.
 */
export const modelOutputSchema = analysisResultSchema.omit({ usage: true });

export const SYSTEM_PROMPT = [
  "Ты помощник тренера детской футбольной академии. По кадрам видео и журналу событий предложи оценки по заданным критериям.",
  "Шкала 1–5: 1 — не соответствует возрасту, 2 — ниже ожидаемого, 3 — соответствует возрасту, 4 — выше ожидаемого, 5 — существенно выше.",
  "Ты только предлагаешь оценки. Решение принимает тренер, поэтому не делай выводов о зачислении ребёнка.",
  "Оценивай только то, что видно на кадрах или записано в журнале. Если по материалу судить о критерии нельзя, не включай его в ответ.",
  "Пиши по-русски, доброжелательно и конкретно, про действия на поле, а не про личность ребёнка. Комментарий к критерию: одно-два предложения.",
  "Не называй имён. В summary: два-три предложения о том, что получается и над чем поработать.",
  "keyMoments: не больше пяти важных моментов, timeSec берёшь из подписей кадров («Кадр на N с»).",
  "Используй в criterionKey только ключи из списка критериев.",
].join("\n");

/** For providers without a schema parameter: the answer shape in words. */
export const JSON_SHAPE_PROMPT = [
  "Ответь одним JSON-объектом без пояснений и без markdown, ровно такой формы:",
  '{"suggestions":[{"criterionKey":"<ключ>","score":<целое 1-5>,"comment":"<текст>"}],',
  '"summary":"<текст>","keyMoments":[{"timeSec":<число>,"description":"<текст>"}]}',
].join("\n");

export const MAX_OUTPUT_TOKENS = 8_000;
export const REQUEST_TIMEOUT_MS = 120_000;

/** The caption that goes before each frame so the model can cite moments. */
export const frameCaption = (timeSec: number) =>
  `Кадр на ${timeSec.toFixed(1)} с`;

/** The closing text of the request: criteria and the journal, if any. */
export function criteriaText(input: AnalysisInput): string {
  const parts = [`Критерии для оценки (ключи): ${input.criteria.join(", ")}`];
  if (input.eventLog) {
    parts.push(`Журнал событий:\n<event_log>\n${input.eventLog}\n</event_log>`);
  }
  return parts.join("\n\n");
}

/**
 * Checks the model's output, keeps only the criteria that were asked for (one
 * suggestion each) and adds the token usage the API reported.
 */
export function finishResult(
  rawOutput: unknown,
  input: AnalysisInput,
  usage: { inputTokens: number; outputTokens: number },
): AnalysisResult {
  const parsed = modelOutputSchema.safeParse(rawOutput);
  if (!parsed.success) {
    throw new AnalysisError("The answer did not match the expected format");
  }
  const asked = new Set(input.criteria);
  const seen = new Set<string>();
  const suggestions = parsed.data.suggestions.filter((suggestion) => {
    if (!asked.has(suggestion.criterionKey)) return false;
    if (seen.has(suggestion.criterionKey)) return false;
    seen.add(suggestion.criterionKey);
    return true;
  });
  return parseAnalysisResult({ ...parsed.data, suggestions, usage });
}

/** Picks up to `max` frames spread evenly over the video, in time order. */
export function sampleFrames<T>(frames: readonly T[], max: number): T[] {
  if (frames.length <= max) return [...frames];
  if (max <= 1) return frames.slice(0, Math.max(0, max));
  return Array.from(
    { length: max },
    (_, i) => frames[Math.round((i * (frames.length - 1)) / (max - 1))],
  );
}

/** JSON from a model answer, also when it came wrapped in a ```json fence. */
export function parseJsonAnswer(text: string): unknown {
  const trimmed = text.trim();
  const unfenced = trimmed.startsWith("```")
    ? trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
    : trimmed;
  try {
    return JSON.parse(unfenced);
  } catch {
    throw new AnalysisError("The answer was not valid JSON");
  }
}

/** A short, safe error text: never the body of the reply or the request. */
export function httpFailure(provider: string, status: number): AnalysisError {
  return new AnalysisError(`${provider} request failed (HTTP ${status})`);
}

export function networkFailure(
  provider: string,
  error: unknown,
): AnalysisError {
  const name = error instanceof Error ? error.name : "unknown error";
  return new AnalysisError(`${provider} request failed (${name})`);
}
