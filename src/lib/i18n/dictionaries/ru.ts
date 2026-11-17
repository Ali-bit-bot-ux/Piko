import { landingRu } from "./landing.ru";
import { resultsRu } from "./results.ru";

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
  landing: landingRu,
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
  intakeDetail: {
    back: "Все наборы",
    publish: "Открыть регистрацию",
    publishing: "Открываем…",
    draftNote:
      "Регистрация закрыта: набор пока черновик. Откройте её, когда будете готовы принимать заявки.",
    registrationTitle: "Регистрация родителей",
    registrationHint:
      "Родители сканируют QR-код или открывают ссылку и заполняют форму.",
    linkLabel: "Ссылка для регистрации",
    qrAlt: "QR-код со ссылкой на регистрацию",
    errorForbidden: "У вас нет прав открывать регистрацию.",
  },
  join: {
    title: "Регистрация на отбор",
    intro: "Набор: {name}",
    group: "Группа {year} г. р.",
    childName: "ФИО ребёнка",
    childBirthDate: "Дата рождения ребёнка",
    parentName: "ФИО родителя",
    parentContact: "Телефон или эл. почта родителя",
    parentContactHint: "Используем только для связи по отбору.",
    consent:
      "Я согласен(на) на обработку персональных данных моего ребёнка для участия в отборе.",
    consentNote:
      "Временный текст: окончательная редакция согласия будет добавлена.",
    submit: "Записать ребёнка",
    submitting: "Отправляем…",
    successTitle: "Заявка принята",
    successText:
      "Мы записали вашего ребёнка. Организаторы свяжутся с вами по указанному контакту.",
    closedTitle: "Регистрация закрыта",
    closedText: "Сейчас этот набор не принимает заявки.",
    errors: {
      name_required: "Введите ФИО ребёнка.",
      birth_date_invalid: "Укажите дату рождения ребёнка.",
      birth_year_mismatch:
        "Этот набор для детей {year} года рождения. Проверьте дату рождения.",
      parent_name_required: "Введите ФИО родителя.",
      contact_invalid:
        "Укажите телефон или эл. почту, например +7 700 000 00 00.",
      consent_required: "Нужно согласие на обработку данных, чтобы продолжить.",
    },
    codes: {
      closed: "Сейчас этот набор не принимает заявки.",
      duplicate: "Этот ребёнок уже записан в набор.",
      full: "В наборе больше нет мест для регистрации.",
      throttled: "Слишком много попыток. Попробуйте позже.",
      generic: "Не удалось отправить заявку. Попробуйте ещё раз.",
    },
  },
  candidates: {
    title: "Кандидаты",
    listLabel: "Список кандидатов",
    searchLabel: "Поиск по имени",
    searchPlaceholder: "Начните вводить имя",
    statusLabel: "Статус",
    allStatuses: "Все статусы",
    apply: "Показать",
    reset: "Сбросить",
    empty:
      "Пока никто не зарегистрировался. Покажите родителям QR-код или отправьте им ссылку.",
    emptyDraft: "Кандидаты появятся после открытия регистрации.",
    emptyFiltered: "Никого не нашли. Измените поиск или фильтр.",
    found: "Найдено: {shown} из {total}",
    birthDate: "Родился: {date}",
    parent: "Родитель: {name}",
    registeredAt: "Заявка: {date}",
    status: {
      registered: "Зарегистрирован",
      checked_in: "Пришёл",
      evaluated: "Оценён",
      decided: "Решение принято",
    },
  },
  trials: {
    title: "Испытания",
    hint: "Выберите испытание и записывайте результаты с секундомера.",
    notOpen: "Испытания доступны, когда регистрация открыта.",
    back: "К набору",
    open: "Открыть",
    types: {
      sprint_20m: "Спринт 20 м",
      shuttle_5_10_5: "Челнок 5–10–5",
      dribbling: "Ведение мяча",
      passing: "Передачи",
      shooting: "Удары по воротам",
    },
    runner: {
      candidate: "Кандидат",
      choose: "Выберите кандидата",
      noCandidates: "В наборе пока нет кандидатов.",
      start: "Старт",
      stop: "Стоп",
      reset: "Сбросить",
      save: "Сохранить попытку {attempt}",
      saving: "Сохраняем…",
      saved: "Записано: {value} с",
      attemptsTitle: "Записанные попытки",
      attemptLine: "Попытка {attempt}: {value} с",
      noAttempts: "Попыток пока нет.",
      best: "Лучшая: {value} с",
      allDone: "Обе попытки уже записаны.",
      timerLabel: "Секундомер",
      errors: {
        invalid: "Не удалось записать: проверьте время.",
        forbidden: "Нет прав записывать результаты.",
        not_found: "Кандидат или испытание не найдены.",
        closed: "Испытания сейчас недоступны для этого набора.",
        attempt_taken: "Эта попытка уже записана.",
        generic: "Не удалось записать результат. Попробуйте ещё раз.",
      },
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
  results: resultsRu,
  // Decision statuses, see docs/scoring.md.
  status: {
    enrolled: "Зачислен",
    reserve: "Резерв",
    review: "Повторный просмотр",
    rejected: "Не зачислен",
  },
};

export type Dictionary = typeof ru;
