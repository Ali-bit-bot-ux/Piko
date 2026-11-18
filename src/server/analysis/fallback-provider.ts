import { AnalysisError } from "./types";
import type { AnalysisInput, AnalysisProvider, AnalysisResult } from "./types";

/**
 * Tries the main provider; when it fails (limit reached, outage, a refused or
 * unreadable answer) asks the backup. `name` is the provider that actually
 * answered, so the saved analysis says who wrote it.
 */
export class FallbackAnalysisProvider implements AnalysisProvider {
  private answeredBy: string;

  constructor(
    private readonly primary: AnalysisProvider,
    private readonly backup: AnalysisProvider,
  ) {
    this.answeredBy = primary.name;
  }

  get name(): string {
    return this.answeredBy;
  }

  async analyze(input: AnalysisInput): Promise<AnalysisResult> {
    try {
      const result = await this.primary.analyze(input);
      this.answeredBy = this.primary.name;
      return result;
    } catch (primaryError) {
      // Only the class and the short message of our own errors are logged.
      console.error(
        `${this.primary.name} failed, trying ${this.backup.name}:`,
        primaryError instanceof AnalysisError
          ? primaryError.message
          : primaryError instanceof Error
            ? primaryError.name
            : "unknown",
      );
    }
    const result = await this.backup.analyze(input);
    this.answeredBy = this.backup.name;
    return result;
  }
}
