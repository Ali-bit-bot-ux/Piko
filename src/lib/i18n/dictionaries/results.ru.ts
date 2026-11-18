/**
 * Texts of the results area: counted tests (passing, shooting), corrections
 * of saved results and the candidate result page (docs/scoring.md).
 * Kazakh texts are given by the owner, none are invented here.
 */
export const resultsRu = {
  /** Counted tests: successes out of 10. */
  counts: {
    trialsHint:
      "Выберите испытание: время записывается с секундомера, передачи и удары отмечаются числом из 10.",
    hint: "Выберите кандидата и отметьте, сколько попыток из 10 удались.",
    pickLabel: "Сколько удалось из 10",
    optionLabel: "{value} из 10",
    save: "Сохранить попытку {attempt}",
    saving: "Сохраняем…",
    saved: "Записано: {value} из 10",
    attemptLine: "Попытка {attempt}: {value} из 10",
    best: "Лучшая: {value} из 10",
    chooseValue: "Сначала выберите результат.",
  },
  /** Correcting a saved result. */
  correction: {
    fix: "Исправить",
    titleLine: "Исправление попытки {attempt}",
    newValue: "Новое значение",
    reason: "Причина исправления",
    reasonHint:
      "Обязательно. Не указывайте имена и контакты: причина остаётся в журнале.",
    submit: "Сохранить исправление",
    saving: "Сохраняем…",
    cancel: "Отмена",
    done: "Исправлено: {value}",
    errors: {
      invalid: "Проверьте значение и причину (не короче 3 символов).",
      forbidden: "Нет прав исправлять результаты.",
      not_found: "Результат не найден.",
      closed: "Набор закрыт для исправлений.",
      unchanged: "Значение не изменилось.",
      conflict: "Результат уже изменили. Обновите страницу.",
      generic: "Не удалось сохранить исправление. Попробуйте ещё раз.",
    },
  },
  /** Candidate result page. */
  candidate: {
    open: "Результат",
    back: "К набору",
    childTitle: "Данные кандидата",
    birthDate: "Родился: {date}",
    parent: "Родитель: {name}",
    status: "Статус: {status}",
    trialsTitle: "Результаты испытаний",
    trialsEmpty: "Результатов испытаний пока нет.",
    trialBest: "{value}",
    trialSeconds: "{value} с",
    trialCount: "{value} из 10",
    trialAttempts: "Попытки: {list}",
    trialNorm: "По возрастному нормативу: {score} из 5",
    trialNormApproximate:
      "По возрастному нормативу: {score} из 5 (приблизительно)",
    evaluationTitle: "Оценка тренера",
    evaluationHint:
      "Оцените кандидата по каждому критерию от 1 до 5. Оценку можно изменить, пока набор открыт.",
    weight: "Вес: {weight}%",
    myScore: "Ваша оценка: {score}",
    noScore: "Вы ещё не оценили",
    scoreButton: "{score}",
    scoreButtonAria: "{criterion}: {score}, {meaning}",
    saving: "Сохраняем…",
    saved: "Оценка сохранена",
    closed: "Оценки доступны, пока набор открыт.",
    resultTitle: "Итог",
    totalLabel: "Итоговая оценка",
    incomplete: "Итог появится, когда будут оценки по всем критериям.",
    progress: "Оценено критериев: {done} из {total}",
    disagreementTitle: "Разница мнений тренеров",
    disagreementNone: "Тренеры оценили похоже.",
    disagreementLine: "{criterion}: оценки от {min} до {max}",
    disagreementNote:
      "Разница оценок от {threshold} и больше отправляет кандидата на повторный просмотр.",
    lowCriterionNote:
      "Критерий с оценкой 1 не позволяет присвоить статус «Зачислен».",
    coachRatings: "Оценки тренеров: {list}",
    aiNote: "Оценка предварительная: тренер может её изменить.",
    errors: {
      invalid: "Оценка должна быть целым числом от 1 до 5.",
      forbidden: "Нет прав оценивать кандидатов.",
      not_found: "Кандидат не найден.",
      closed: "Набор закрыт для оценки.",
      generic: "Не удалось сохранить оценку. Попробуйте ещё раз.",
    },
  },
  /** Criterion titles by stable key (src/server/scoring/profiles.ts). */
  criteria: {
    ball_comfort: "Комфорт с мячом",
    coordination_agility: "Координация и ловкость",
    activity_desire: "Активность и желание играть",
    learnability: "Обучаемость",
    ball_control: "Контроль мяча",
    passing: "Передачи",
    speed_agility: "Скорость и ловкость",
    game_thinking: "Игровое мышление",
    attitude: "Отношение к игре",
    passing_reception: "Передачи и приём",
    speed: "Скорость",
    tactics: "Тактика",
    character_communication: "Характер и коммуникация",
  },
  /** The 1..5 scale (docs/scoring.md). */
  scale: {
    "1": "Не соответствует возрастному уровню",
    "2": "Ниже ожидаемого",
    "3": "Соответствует возрасту",
    "4": "Выше ожидаемого",
    "5": "Существенно выше возрастного уровня",
  },
  /** Decision statuses (docs/scoring.md). */
  decisions: {
    enrolled: "Зачислен",
    reserve: "Резерв",
    review: "Повторный просмотр",
    rejected: "Не зачислен",
  },
};
