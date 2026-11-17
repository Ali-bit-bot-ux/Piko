// Age profiles with criteria and weights (docs/scoring.md). Data, not code in
// components. Criterion keys are stored in the database (Evaluation.criterionKey),
// so they must stay stable: rename the label in the dictionary, never the key.

export const ageProfileKeys = ["U7_U9", "U10_U11", "U12_U14"] as const;
export type AgeProfileKey = (typeof ageProfileKeys)[number];

/** Scale of one criterion (docs/scoring.md). */
export const SCALE_MIN = 1;
export const SCALE_MAX = 5;

export type Criterion = {
  /** Stable snake_case key. */
  key: string;
  /** Share of the total, in percent. */
  weight: number;
};

export const profiles: Readonly<Record<AgeProfileKey, readonly Criterion[]>> = {
  U7_U9: [
    { key: "ball_comfort", weight: 25 },
    { key: "coordination_agility", weight: 25 },
    { key: "activity_desire", weight: 25 },
    { key: "learnability", weight: 25 },
  ],
  U10_U11: [
    { key: "ball_control", weight: 20 },
    { key: "passing", weight: 20 },
    { key: "speed_agility", weight: 15 },
    { key: "game_thinking", weight: 20 },
    { key: "learnability", weight: 10 },
    { key: "attitude", weight: 15 },
  ],
  U12_U14: [
    { key: "ball_control", weight: 15 },
    { key: "passing_reception", weight: 15 },
    { key: "speed", weight: 10 },
    { key: "game_thinking", weight: 20 },
    { key: "tactics", weight: 15 },
    { key: "learnability", weight: 10 },
    { key: "character_communication", weight: 15 },
  ],
};

export function criterionKeys(profile: AgeProfileKey): string[] {
  return profiles[profile].map((criterion) => criterion.key);
}
