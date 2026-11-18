/** Texts of the academy analytics page (T-063). */
export const analyticsRu = {
  title: "Аналитика",
  intro:
    "Как академия пользуется платформой и насколько согласованы оценки. Только числа, без имён детей.",
  empty: "Пока нет наборов для аналитики.",
  totalTitle: "Все наборы вместе",
  intakeTitle: "Набор: {name}",
  funnel: {
    title: "Путь кандидатов",
    candidates: "Зарегистрировано",
    withResults: "С результатами испытаний",
    rated: "Оценены тренерами",
    scored: "С итоговой оценкой",
    ofCandidates: "{percent}% от зарегистрированных",
  },
  quality: {
    title: "Качество оценок",
    averageTotal: "Средний итог",
    averageNone: "нет оценок",
    disagreements: "Сильное расхождение тренеров",
    disagreementsHint: "{count} из {scored} оценённых",
  },
  decisions: {
    title: "Решения",
  },
  reports: {
    title: "Отчёты родителям",
    created: "Создано",
    sent: "Отправлено",
    opened: "Открыто родителями",
    openRate: "{percent}% отправленных открыли",
  },
  ai: {
    title: "ИИ-подсказки",
    runs: "Запусков анализа",
    tokens: "Токенов всего",
  },
  noData: "нет данных",
} as const;
