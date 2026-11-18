import { describe, expect, it } from "vitest";
import {
  percent,
  summarizeIntake,
  sumMetrics,
  type CandidateRow,
} from "./summarize";

const row = (over: Partial<CandidateRow> = {}): CandidateRow => ({
  intakeId: "i1",
  measurementCount: 0,
  ratingCount: 0,
  score: null,
  report: null,
  analyses: [],
  ...over,
});

const score = (
  total: number,
  decision: "enrolled" | "reserve" | "review" | "rejected",
  strongDisagreement = false,
) => ({ total, decision, strongDisagreement });

describe("percent", () => {
  it("rounds and is null for an empty whole", () => {
    expect(percent(1, 3)).toBe(33);
    expect(percent(2, 3)).toBe(67);
    expect(percent(0, 0)).toBeNull();
  });
});

describe("summarizeIntake", () => {
  it("is all zeros for an intake without children", () => {
    const m = summarizeIntake("i1", []);
    expect(m.candidates).toBe(0);
    expect(m.averageTotal).toBeNull();
    expect(m.decisions).toEqual({
      enrolled: 0,
      reserve: 0,
      review: 0,
      rejected: 0,
    });
  });

  it("counts the funnel, decisions, reports and AI use of one intake only", () => {
    const rows = [
      row({ measurementCount: 2 }),
      row({
        measurementCount: 1,
        ratingCount: 4,
        score: score(4.5, "enrolled"),
        report: { sent: true, opened: true },
        analyses: [{ inputTokens: 100, outputTokens: 20 }],
      }),
      row({
        ratingCount: 4,
        score: score(3.25, "review", true),
        report: { sent: true, opened: false },
        analyses: [
          { inputTokens: 10, outputTokens: 5 },
          { inputTokens: 10, outputTokens: 5 },
        ],
      }),
      row({ intakeId: "other", score: score(1, "rejected") }),
    ];
    const m = summarizeIntake("i1", rows);
    expect(m).toMatchObject({
      candidates: 3,
      withResults: 2,
      rated: 2,
      scored: 2,
      averageTotal: 3.88,
      strongDisagreements: 1,
      reportsCreated: 2,
      reportsSent: 2,
      reportsOpened: 1,
      analysisRuns: 3,
      analysisTokens: 150,
    });
    expect(m.decisions).toEqual({
      enrolled: 1,
      reserve: 0,
      review: 1,
      rejected: 0,
    });
  });
});

describe("sumMetrics", () => {
  it("adds intakes up and weights the average by scored children", () => {
    const a = summarizeIntake("i1", [row({ score: score(5, "enrolled") })]);
    const b = summarizeIntake("i2", [
      row({ intakeId: "i2", score: score(3, "review") }),
      row({ intakeId: "i2", score: score(3, "review") }),
    ]);
    const all = sumMetrics([a, b]);
    expect(all.candidates).toBe(3);
    expect(all.scored).toBe(3);
    expect(all.averageTotal).toBe(3.67);
    expect(all.decisions.review).toBe(2);
    expect(sumMetrics([]).averageTotal).toBeNull();
  });
});
