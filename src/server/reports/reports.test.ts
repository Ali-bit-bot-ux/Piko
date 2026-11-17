import { describe, expect, it } from "vitest";
import { phraseBand, pickHighlights } from "./phrases";
import {
  generateReportToken,
  hashReportToken,
  isReportExpired,
  isReportTokenShape,
  REPORT_TTL_DAYS,
  reportExpiry,
} from "./token";
import { profiles } from "../scoring";
import { reportRu } from "@/lib/i18n/dictionaries/report.ru";

describe("report token", () => {
  it("is 32 random bytes in base64url", () => {
    const token = generateReportToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(isReportTokenShape(token)).toBe(true);
    expect(generateReportToken()).not.toBe(token);
  });

  it("rejects strings of the wrong shape", () => {
    expect(isReportTokenShape("")).toBe(false);
    expect(isReportTokenShape("abc")).toBe(false);
    expect(isReportTokenShape(`${"a".repeat(42)}!`)).toBe(false);
    expect(isReportTokenShape("a".repeat(44))).toBe(false);
  });

  it("hashes to a stable SHA-256 hex that differs from the token", () => {
    const token = generateReportToken();
    expect(hashReportToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashReportToken(token)).toBe(hashReportToken(token));
    expect(hashReportToken(token)).not.toContain(token);
  });

  it("expires after 30 days", () => {
    const from = new Date("2026-11-17T00:00:00Z");
    const expiresAt = reportExpiry(from);
    expect(REPORT_TTL_DAYS).toBe(30);
    expect(expiresAt.toISOString()).toBe("2026-12-17T00:00:00.000Z");
    expect(isReportExpired(expiresAt, from)).toBe(false);
    expect(isReportExpired(expiresAt, expiresAt)).toBe(true);
  });
});

describe("report phrases", () => {
  it("bands scores", () => {
    expect(phraseBand(5)).toBe("strength");
    expect(phraseBand(4)).toBe("strength");
    expect(phraseBand(3.5)).toBeNull();
    expect(phraseBand(3)).toBeNull();
    expect(phraseBand(2.5)).toBe("growth");
    expect(phraseBand(1)).toBe("growth");
  });

  it("picks the best and the weakest criteria, at most three each", () => {
    const result = pickHighlights([
      { key: "a", score: 4 },
      { key: "b", score: 5 },
      { key: "c", score: 4.5 },
      { key: "d", score: 4 },
      { key: "e", score: 2 },
      { key: "f", score: 1 },
      { key: "g", score: 3 },
    ]);
    expect(result.strengths).toEqual(["b", "c", "a"]);
    expect(result.growth).toEqual(["f", "e"]);
  });

  it("returns nothing when everything is at age level", () => {
    expect(pickHighlights([{ key: "a", score: 3 }])).toEqual({
      strengths: [],
      growth: [],
    });
  });

  it("has a sentence for every criterion of every profile", () => {
    for (const profile of Object.values(profiles)) {
      for (const { key } of profile) {
        expect(reportRu.strengths).toHaveProperty(key);
        expect(reportRu.growth).toHaveProperty(key);
      }
    }
  });
});
