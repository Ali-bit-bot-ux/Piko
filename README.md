# Piko

Платформа честного и понятного отбора детей в футбольные академии (Казахстан): набор → регистрация детей по QR → испытания → оценка по единым критериям → отчёт родителю. ИИ даёт тренеру подсказки по видео, итог подтверждает человек.

Что строим и почему: [docs/product.md](docs/product.md). Как устроено: [docs/architecture.md](docs/architecture.md). Все решения: [docs/decisions.md](docs/decisions.md). Задачи: [TASKS.md](TASKS.md). Что сделано и что дальше: [PROGRESS.md](PROGRESS.md).

## Быстрый старт

Нужны: Node.js 24, npm 11, Postgres 16 или новее.

```bash
git clone https://github.com/Ali-bit-bot-ux/Piko.git
cd Piko
npm install
```

1. Создайте пустую базу (например `piko`).
2. Скопируйте `.env.example` в `.env.local` и заполните: `DATABASE_URL`, `AUTH_SECRET` (команда для генерации в самом файле). `ANALYSIS_PROVIDER=stub` оставьте, пока не подключён настоящий ИИ.
3. Примените миграции и загрузите демо-данные:

```bash
npm run db:deploy
npm run db:seed
```

4. Запустите:

```bash
npm run dev
```

Демо-вход для сотрудников: адреса `demo-director@example.invalid` и `demo-coach@example.invalid`, пароль указан константой `DEMO_PASSWORD` в `prisma/seed.ts` (только для локальной разработки).

## Команды

| Команда | Что делает |
|---|---|
| `npm run dev` | запуск для разработки |
| `npm run lint` · `npm run typecheck` · `npm run format:check` | проверки кода |
| `npm test` | все тесты (тесты на базе пропускаются, если не задан `DATABASE_URL`) |
| `npm run test:coverage` | покрытие (порог 80% для `src/server` и `src/lib`) |
| `npm run build` | production-сборка (до ~70 секунд, запускать отдельно) |
| `npm run db:migrate` | новая миграция после правки `prisma/schema.prisma` |
| `npm run db:seed` | демо-данные (безопасно запускать повторно) |

После изменения схемы Prisma запустите `npm run db:generate`.

## Как работаем

- Одна задача на ветку (`t-0NN-название`), небольшие коммиты, проверки зелёные до коммита.
- Перед работой прочитайте [AGENTS.md](AGENTS.md): правила для людей и ИИ-агентов (данные детей, доступ только к своей академии, тексты интерфейса только из словаря и т. д.).
- Закончив задачу: статус в `TASKS.md`, запись в `PROGRESS.md`, новое решение в `docs/decisions.md`.
- Внешние сервисы (модель анализа, хранилище) только через интерфейсы `AnalysisProvider` и `Storage`: так подключается Google Cloud без переписывания приложения.

## Запуск в production

Нужны переменные `AUTH_URL` (= `APP_URL`) и `AUTH_SECRET`; без `AUTH_URL` вход отвечает 500. Подробности и известные ограничения: [docs/handoff.md](docs/handoff.md).
