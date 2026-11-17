/**
 * Russian UI texts. This object defines the shape of every dictionary:
 * other locales must provide the same keys (see ./index.ts).
 * Placeholders use {name} and are filled with interpolate().
 */
export const ru = {
  meta: {
    title: "Piko",
    description: "Честный и понятный отбор в футбольные академии",
  },
  common: {
    scoreAria: "{label}: {value} из {max}",
    scoreOutOf: "из {max}",
  },
  // Decision statuses, see docs/scoring.md.
  status: {
    enrolled: "Зачислен",
    reserve: "Резерв",
    review: "Повторный просмотр",
    rejected: "Не зачислен",
  },
};

export type Dictionary = typeof ru;
