import {
  assertInputWithinLimits,
  parseAnalysisResult,
  type AnalysisInput,
  type AnalysisProvider,
  type AnalysisResult,
} from "./types";

/**
 * Deterministic fake provider for development and tests.
 * It never calls a network service and always suggests the middle score.
 */
export class StubAnalysisProvider implements AnalysisProvider {
  readonly name = "stub";

  async analyze(input: AnalysisInput): Promise<AnalysisResult> {
    assertInputWithinLimits(input);
    return parseAnalysisResult({
      suggestions: input.criteria.map((criterionKey) => ({
        criterionKey,
        score: 3,
        comment: "Заглушка: оценка не получена от модели.",
      })),
      summary: "Заглушка анализа: реальная модель не подключена.",
      keyMoments: [],
      usage: { inputTokens: 0, outputTokens: 0 },
    });
  }
}
