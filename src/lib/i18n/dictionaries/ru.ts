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
  // Marketing site navigation (labels only; paths live in src/lib/routes.ts).
  nav: {
    about: "О платформе",
    academies: "Для академий",
    parents: "Для родителей",
    pricing: "Тарифы",
  },
  auth: {
    login: "Войти",
    start: "Начать бесплатно",
  },
  header: {
    homeAria: "Piko, на главную",
    mainNav: "Основная навигация",
    openMenu: "Открыть меню",
    closeMenu: "Закрыть меню",
    skipToContent: "Перейти к содержимому",
  },
  footer: {
    tagline: "Честный и понятный отбор в футбольные академии",
    sections: "Разделы",
    rights: "© Piko. Все права защищены.",
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
