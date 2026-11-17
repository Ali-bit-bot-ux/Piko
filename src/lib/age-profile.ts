import type { AgeProfile } from "@/generated/prisma/enums";

export const MIN_AGE = 7;
export const MAX_AGE = 14;

/**
 * Age profile (docs/scoring.md) of a group: age is the tryout year minus the
 * birth year. Returns null outside U7..U14.
 */
export function ageProfileFor(
  birthYear: number,
  tryoutYear: number,
): AgeProfile | null {
  if (!Number.isInteger(birthYear) || !Number.isInteger(tryoutYear)) {
    return null;
  }
  const age = tryoutYear - birthYear;
  if (age >= 7 && age <= 9) return "U7_U9";
  if (age >= 10 && age <= 11) return "U10_U11";
  if (age >= 12 && age <= 14) return "U12_U14";
  return null;
}
