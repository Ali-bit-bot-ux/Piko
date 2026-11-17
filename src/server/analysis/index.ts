import { ConfigError, type AppConfig } from "../config";
import { ClaudeAnalysisProvider } from "./claude-provider";
import { StubAnalysisProvider } from "./stub-provider";
import { AnalysisError, type AnalysisProvider } from "./types";

export * from "./types";
export { ClaudeAnalysisProvider } from "./claude-provider";
export { StubAnalysisProvider } from "./stub-provider";

/** Builds the provider chosen by ANALYSIS_PROVIDER. */
export function createAnalysisProvider(
  config: Pick<
    AppConfig,
    "analysisProvider" | "anthropicApiKey" | "anthropicModel"
  >,
): AnalysisProvider {
  switch (config.analysisProvider) {
    case "stub":
      return new StubAnalysisProvider();
    case "claude":
      if (!config.anthropicApiKey) {
        throw new ConfigError(
          "ANTHROPIC_API_KEY is required when ANALYSIS_PROVIDER=claude",
        );
      }
      return new ClaudeAnalysisProvider({
        apiKey: config.anthropicApiKey,
        model: config.anthropicModel,
      });
    case "google":
      throw new AnalysisError("Google provider is not implemented yet (T-061)");
  }
}
