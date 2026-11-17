import { SCALE_MIN } from "../scoring";

/** Ratings at or above this are described as strengths. */
export const STRENGTH_MIN = 4;
/** Ratings at or below this are described as areas to work on. */
export const GROWTH_MAX = 2.5;

export type PhraseBand = "strength" | "growth";

/** Band of one criterion score, or null for "right at age level". */
export function phraseBand(score: number): PhraseBand | null {
  if (score >= STRENGTH_MIN) return "strength";
  if (score <= GROWTH_MAX && score >= SCALE_MIN) return "growth";
  return null;
}

/**
 * Picks the criteria worth a sentence: the best ones as strengths, the
 * weakest ones as growth areas. The sentences themselves come from the
 * dictionary by criterion and band, so nothing about the child is invented.
 */
export function pickHighlights(
  criteria: readonly { key: string; score: number }[],
  limit = 3,
): { strengths: string[]; growth: string[] } {
  const strengths = criteria
    .filter((c) => phraseBand(c.score) === "strength")
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((c) => c.key);
  const growth = criteria
    .filter((c) => phraseBand(c.score) === "growth")
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((c) => c.key);
  return { strengths, growth };
}
