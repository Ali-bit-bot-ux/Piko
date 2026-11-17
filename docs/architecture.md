# Архитектура Piko

Продукт описан в `docs/product.md`, дизайн в `docs/design.md`, принятые решения в `docs/decisions.md`.

## Обзор
Один репозиторий Next.js (App Router, TypeScript): публичный сайт, кабинет и API вместе. Бизнес-логика лежит в `src/server/` и не зависит от страниц. Внешние сервисы (модель, хранилище, БД-доступ) скрыты за интерфейсами.

```
Браузер (мобильный/десктоп)
   │
   ▼
Next.js
 ├─ src/app/            страницы (RSC) + route handlers (/api)
 ├─ src/components/     UI (ui/ — кит, features/ — по доменам)
 └─ src/server/         вся бизнес-логика
      ├─ domain/        типы и правила: Intake, Candidate, Trial, Score...
      ├─ scoring/       расчёт итогового балла (чистые функции)
      ├─ analysis/      AnalysisProvider (claude, google)
      ├─ video/         нарезка видео на кадры
      ├─ storage/       Storage (local, cloud)
      ├─ db/            схема, миграции, репозитории
      ├─ auth/          сессии и роли
      └─ reports/       сборка отчёта, PDF
```

## Структура репозитория (целевая)
```
Piko/
  AGENTS.md  ROADMAP.md  TASKS.md  PROGRESS.md
  docs/  product.md design.md architecture.md decisions.md reference/
  .claude/skills/        скиллы проекта
  src/
    app/
      (marketing)/       лендинг, тарифы, о платформе
      (auth)/            вход, регистрация
      (app)/             кабинет: наборы, кандидаты, испытания, результаты
      r/[token]/         публичный отчёт для родителя
      join/[intakeId]/   регистрация по QR
      api/
    components/ui/  components/features/
    server/  (см. выше)
    lib/                 общие утилиты, zod-схемы
    styles/tokens.css
  tests/
```

## Модель данных (черновик)
- **Organization** (академия): название, город, тариф.
- **User**: роль `admin | coach | parent`, привязан к Organization (кроме parent).
- **Intake** (набор): organizationId, название, год рождения группы, дата, статус `draft | open | testing | finished`, веса критериев.
- **Candidate** (кандидат): intakeId, имя, дата рождения, контакт родителя, согласие (дата, версия текста), статус.
- **Trial** (испытание): intakeId, тип (`sprint30`, `ball_control`, `passing`, `game`), статус.
- **Measurement**: candidateId, trialId, значение (например время), источник `manual | timer | ai`.
- **Analysis**: candidateId, источник (лог/видео), отчёт модели (JSON), токены, стоимость.
- **Score**: candidateId, итог 0–100, баллы по критериям, рекомендация.
- **Report**: candidateId, публичный токен, срок действия, текст для родителя.
Удаление кандидата удаляет всё связанное (согласие и срок хранения см. AGENTS.md).

## Потоки
**Регистрация:** родитель открывает `join/[intakeId]` по QR → форма и согласие → Candidate.
**Испытание:** тренер открывает Trial → таймер → Measurement.
**Анализ:** загрузка лога и/или видео → `video/` режет на кадры (лимит) → `AnalysisProvider.analyze()` → ответ валидируется zod-схемой → Analysis.
**Итог:** `scoring/` считает Score из Measurement и Analysis → рекомендация → Report → ссылка родителю.

## Интерфейсы (границы)
```ts
interface AnalysisProvider {
  analyze(input: AnalysisInput): Promise<AnalysisResult>; // валидируется zod
}
interface Storage {
  put(key: string, data: Uint8Array): Promise<void>;
  get(key: string): Promise<Uint8Array>;   // StorageError "not_found"
  delete(key: string): Promise<void>;      // идемпотентно (D-020)
  signedUrl(key: string, ttlSec: number): Promise<string>;
}
```
Реализации выбираются через конфиг (`ANALYSIS_PROVIDER=stub|claude|google`, `STORAGE=local|cloud`, читает `src/server/config.ts`). Страницы и компоненты не импортируют SDK напрямую.

Состояние (T-007): есть `StubAnalysisProvider` (заглушка для разработки и тестов) и `LocalStorage` (диск, каталог `.data/storage`, ключи проверяются от выхода за корень). Claude (T-042), Google и облачное хранилище (T-061) пока выдают понятную ошибку «not implemented». Локальное хранилище не умеет `signedUrl` (ошибка `unsupported`). Ответ провайдера всегда проходит `parseAnalysisResult` (zod). Лимит кадров на запрос: `MAX_FRAMES_PER_REQUEST = 40`.

## Рекомендуемые технологии (подтверждает команда, см. decisions.md)
Tailwind CSS (токены из `tokens.css`), Postgres + Prisma, Auth.js, zod, Vitest, Playwright, Lucide.

## Безопасность и данные
- Секреты только в `.env.local`; `.env.example` обновлять.
- Публичные отчёты по неугадываемому токену с сроком жизни, без индексации поисковиками.
- Доступ к кандидатам только внутри своей Organization (проверка на сервере на каждый запрос).
- Видео и фото детей: шифрование на хранении (облако), срок хранения, удаление по запросу.
- В логах нет имён детей и содержимого видео.

## Риски
- Модель может упустить моменты в длинном видео: сегментация, проверка на реальном матче (задача напарника).
- Стоимость зависит от числа кадров и тарифов: считать токены и стоимость, лимитировать кадры.
- Связь на поле нестабильна: планируем устойчивость ввода (черновики в localStorage), полноценный офлайн позже.
- Оценка ребёнка ИИ не должна быть единственной причиной отказа: тренер может скорректировать и видит обоснование.
