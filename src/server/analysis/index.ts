import {
  ConfigError,
  type AnalysisProviderName,
  type AppConfig,
} from "../config";
import { ClaudeAnalysisProvider } from "./claude-provider";
import { FallbackAnalysisProvider } from "./fallback-provider";
import { GeminiAnalysisProvider } from "./gemini-provider";
import { GroqAnalysisProvider } from "./groq-provider";
import { StubAnalysisProvider } from "./stub-provider";
import type { AnalysisProvider } from "./types";

export * from "./types";
export { ClaudeAnalysisProvider } from "./claude-provider";
export { FallbackAnalysisProvider } from "./fallback-provider";
export { GeminiAnalysisProvider } from "./gemini-provider";
export { GroqAnalysisProvider } from "./groq-provider";
export { StubAnalysisProvider } from "./stub-provider";

export type ProviderConfig = Pick<
  AppConfig,
  "analysisProvider" | "anthropicModel"
> &
  Partial<
    Pick<
      AppConfig,
      | "analysisFallback"
      | "anthropicApiKey"
      | "geminiApiKey"
      | "geminiModel"
      | "groqApiKey"
      | "groqModel"
    >
  >;

function require_(value: string | undefined, variable: string, name: string) {
  if (!value) {
    throw new ConfigError(`${variable} is required when ${name} is used`);
  }
  return value;
}

function build(name: AnalysisProviderName, config: ProviderConfig) {
  switch (name) {
    case "stub":
      return new StubAnalysisProvider();
    case "claude":
      return new ClaudeAnalysisProvider({
        apiKey: require_(config.anthropicApiKey, "ANTHROPIC_API_KEY", name),
        model: config.anthropicModel,
      });
    case "gemini":
      return new GeminiAnalysisProvider({
        apiKey: require_(config.geminiApiKey, "GEMINI_API_KEY", name),
        model: config.geminiModel ?? "gemini-2.5-flash",
      });
    case "groq":
      return new GroqAnalysisProvider({
        apiKey: require_(config.groqApiKey, "GROQ_API_KEY", name),
        model: config.groqModel ?? "meta-llama/llama-4-scout-17b-16e-instruct",
      });
  }
}

/**
 * Builds the provider chosen by ANALYSIS_PROVIDER. With ANALYSIS_FALLBACK set
 * (and different) the backup answers when the main one fails.
 */
export function createAnalysisProvider(
  config: ProviderConfig,
): AnalysisProvider {
  const primary = build(config.analysisProvider, config);
  const backup = config.analysisFallback;
  if (!backup || backup === config.analysisProvider) return primary;
  return new FallbackAnalysisProvider(primary, build(backup, config));
}
