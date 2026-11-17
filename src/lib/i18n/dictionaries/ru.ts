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
  cabinet: {
    navLabel: "Разделы кабинета",
    nav: {
      intakes: "Наборы",
    },
  },
  intakes: {
    title: "Наборы",
    empty: "Здесь появятся ваши наборы.",
    listLabel: "Список наборов",
    birthYear: "Год рождения: {year}",
    candidates: "Кандидатов: {count}",
    tryoutDate: "Испытания: {date}",
    status: {
      draft: "Черновик",
      open: "Идёт регистрация",
      testing: "Идут испытания",
      finished: "Завершён",
    },
    ageProfiles: {
      U7_U9: "U7–U9",
      U10_U11: "U10–U11",
      U12_U14: "U12–U14",
    },
  },
  intakeForm: {
    title: "Новый набор",
    create: "Создать набор",
    name: "Название набора",
    namePlaceholder: "Например, Набор 2015 г. р.",
    birthYear: "Год рождения группы",
    tryoutDate: "Дата испытаний",
    ageProfileHint: "Возрастная группа: {profile}",
    submit: "Создать набор",
    submitting: "Создаём…",
    cancel: "Отмена",
    errorForbidden: "У вас нет прав создавать наборы.",
    errors: {
      name_required: "Введите название набора (до 100 знаков).",
      birth_year_invalid: "Укажите год рождения: четыре цифры.",
      tryout_date_invalid: "Укажите дату испытаний.",
      tryout_date_past: "Дата испытаний не может быть в прошлом.",
      age_out_of_range: "На дату испытаний детям должно быть от 7 до 14 лет.",
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
