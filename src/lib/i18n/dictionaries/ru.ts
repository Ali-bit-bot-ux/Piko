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
  login: {
    title: "Вход для сотрудников академии",
    email: "Эл. почта",
    password: "Пароль",
    submit: "Войти",
    submitting: "Входим…",
    errorInput: "Введите эл. почту и пароль.",
    errorInvalid: "Неверная почта или пароль.",
    errorThrottled: "Слишком много попыток. Попробуйте через 15 минут.",
  },
  dashboard: {
    title: "Кабинет",
    welcome: "Здравствуйте, {name}",
    roleLabel: "Роль",
    logout: "Выйти",
    loading: "Загрузка…",
    roles: {
      admin: "Администратор",
      director: "Директор",
      coach: "Тренер",
      parent: "Родитель",
    },
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
