// Usage and quality numbers of one academy (T-063). Pure functions over rows
// the data layer loads, so they are easy to test. Only counts and averages:
// no names, no contacts.

export type DecisionKey = "enrolled" | "reserve" | "review" | "rejected";

export type CandidateRow = {
  intakeId: string;
  measurementCount: number;
  ratingCount: number;
  score: {
    total: number;
    decision: DecisionKey;
    strongDisagreement: boolean;
  } | null;
  report: { sent: boolean; opened: boolean } | null;
  analyses: { inputTokens: number; outputTokens: number }[];
};

export type IntakeMetrics = {
  intakeId: string;
  candidates: number;
  withResults: number;
  rated: number;
  scored: number;
  decisions: Record<DecisionKey, number>;
  averageTotal: number | null;
  strongDisagreements: number;
  reportsCreated: number;
  reportsSent: number;
  reportsOpened: number;
  analysisRuns: number;
  analysisTokens: number;
};

const emptyDecisions = (): Record<DecisionKey, number> => ({
  enrolled: 0,
  reserve: 0,
  review: 0,
  rejected: 0,
});

const round2 = (value: number) => Math.round(value * 100) / 100;

/** Share in percent, rounded; null when there is nothing to divide by. */
export function percent(part: number, whole: number): number | null {
  return whole === 0 ? null : Math.round((part / whole) * 100);
}

export function summarizeIntake(
  intakeId: string,
  rows: readonly CandidateRow[],
): IntakeMetrics {
  const mine = rows.filter((row) => row.intakeId === intakeId);
  const scored = mine.filter((row) => row.score !== null);
  const decisions = emptyDecisions();
  for (const row of scored) decisions[row.score!.decision] += 1;
  const totalSum = scored.reduce((sum, row) => sum + row.score!.total, 0);
  const tokens = (row: CandidateRow) =>
    row.analyses.reduce((s, a) => s + a.inputTokens + a.outputTokens, 0);

  return {
    intakeId,
    candidates: mine.length,
    withResults: mine.filter((row) => row.measurementCount > 0).length,
    rated: mine.filter((row) => row.ratingCount > 0).length,
    scored: scored.length,
    decisions,
    averageTotal: scored.length === 0 ? null : round2(totalSum / scored.length),
    strongDisagreements: scored.filter((r) => r.score!.strongDisagreement)
      .length,
    reportsCreated: mine.filter((row) => row.report).length,
    reportsSent: mine.filter((row) => row.report?.sent).length,
    reportsOpened: mine.filter((row) => row.report?.opened).length,
    analysisRuns: mine.reduce((sum, row) => sum + row.analyses.length, 0),
    analysisTokens: mine.reduce((sum, row) => sum + tokens(row), 0),
  };
}

/** The same metrics added up over several intakes. */
export function sumMetrics(items: readonly IntakeMetrics[]): IntakeMetrics {
  const total: IntakeMetrics = {
    intakeId: "all",
    candidates: 0,
    withResults: 0,
    rated: 0,
    scored: 0,
    decisions: emptyDecisions(),
    averageTotal: null,
    strongDisagreements: 0,
    reportsCreated: 0,
    reportsSent: 0,
    reportsOpened: 0,
    analysisRuns: 0,
    analysisTokens: 0,
  };
  let weighted = 0;
  for (const item of items) {
    total.candidates += item.candidates;
    total.withResults += item.withResults;
    total.rated += item.rated;
    total.scored += item.scored;
    total.strongDisagreements += item.strongDisagreements;
    total.reportsCreated += item.reportsCreated;
    total.reportsSent += item.reportsSent;
    total.reportsOpened += item.reportsOpened;
    total.analysisRuns += item.analysisRuns;
    total.analysisTokens += item.analysisTokens;
    for (const key of Object.keys(total.decisions) as DecisionKey[]) {
      total.decisions[key] += item.decisions[key];
    }
    weighted += (item.averageTotal ?? 0) * item.scored;
  }
  total.averageTotal =
    total.scored === 0 ? null : round2(weighted / total.scored);
  return total;
}
