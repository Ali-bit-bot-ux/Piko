import type { AppConfig } from "../config";
import { StubAnalysisProvider } from "./stub-provider";
import { AnalysisError, type AnalysisProvider } from "./types";

export * from "./types";
export { StubAnalysisProvider } from "./stub-provider";

/** Builds the provider chosen by ANALYSIS_PROVIDER. */
export function createAnalysisProvider(
  config: Pick<AppConfig, "analysisProvider">,
): AnalysisProvider {
  switch (config.analysisProvider) {
    case "stub":
      return new StubAnalysisProvider();
    case "claude":
      throw new AnalysisError("Claude provider is not implemented yet (T-042)");
    case "google":
      throw new AnalysisError("Google provider is not implemented yet (T-061)");
  }
}
