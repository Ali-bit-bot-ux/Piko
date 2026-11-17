# PROGRESS — Piko

Журнал передачи контекста между сессиями и агентами. Читать после AGENTS.md. Обновлять в конце каждой задачи: новая запись **сверху**.

## Текущее состояние
- Код приложения: каркас Next.js (T-001, отправлен в GitHub) и инструменты (T-002, ветка `t-002-tooling`, не закоммичено).
- Готово: M0 (документы и архитектура), T-001, T-002.
- Следующая задача: T-003 (токены дизайна и UI-кит) или T-004/T-005/T-007 (зависят только от T-001/T-002).
- Репозиторий: git инициализирован, `origin` = https://github.com/Ali-bit-bot-ux/Piko. Коммитов нет, ничего не отправлено.

## Записи

### 2026-11-17 — T-002: инструменты
- Что сделано: Prettier, Vitest (+ coverage-v8), скрипты `typecheck` (`next typegen && tsc --noEmit`), `test`, `test:watch`, `test:coverage`, `format`, `format:check`. Добавлены `.env.example`, исключение `!.env.example` в `.gitignore`, `vitest.config.ts` (алиас `@`, порог покрытия 80% для `src/server` и `src/lib`), `.prettierrc.json`, `.prettierignore`. В AGENTS.md заполнены команды.
- Зависимости: `@types/node` поднят с ^20 до ^24 (vitest 5 требует >=22, на машине Node 24). Причина записана здесь, как требует AGENTS.md.
- Проверено: `lint`, `typecheck`, `format:check`, `build` проходят; `npm test` завершается с кодом 0 («тестов нет», флаг `--passWithNoTests`; уберём, когда появятся первые тесты в T-040).
- Ветка: `t-002-tooling` (от `t-001-scaffold`), не закоммичена. Ветка `t-001-scaffold` отправлена в GitHub.
- Не сделано сознательно: `eslint-config-prettier` (конфликтов правил пока нет, добавить при появлении).

### 2026-11-17 — T-001: каркас Next.js
- Что сделано: Next.js 16.4.6 (App Router, TypeScript, Tailwind 4, ESLint), `src/`, алиас `@/*`. Создана структура папок из architecture.md (с `.gitkeep`). Страница-заглушка «Piko», `lang="ru"`, шрифт Inter с кириллицей (Geist из шаблона кириллицу не поддерживает).
- Файлы: package.json, tsconfig.json, next.config.ts, eslint.config.mjs, .gitignore, src/app/{layout,page,globals.css}, папки src/*, tests/.
- Проверено: `npm run lint` без замечаний; `npm run build` успешно; `tsc --noEmit` чистый после первой сборки; dev-сервер отдаёт HTTP 200, заголовок «Piko».
- Ветка: `t-001-scaffold`. Коммитов нет.
- Заметки для T-002: (1) `tsc` отдельно падает на `LayoutProps`, пока нет сгенерированных типов — в скрипт `typecheck` добавить `next typegen`; (2) `.gitignore` игнорирует все `.env*` — добавить исключение `!.env.example`; (3) шаблон включил `cacheComponents` и `partialPrefetching` в next.config.ts, оставили как есть; (4) Next 16 «не тот Next, что в обучающих данных»: блок в конце AGENTS.md велит читать `node_modules/next/dist/docs/` перед написанием кода; (5) README из шаблона не взят.
- Что осталось: ничего по T-001.

### 2026-11-16 — Ответы владельца на Q-5..Q-10
- Референс признан фейком: брать только дизайн и расположение кнопок и информации (D-018). Оценка по scoring.md: итог 1.00–5.00, спринт 20 м.
- Q-8 согласован (D-019): ИИ — подсказка тренеру.
- Q-9 решён (D-020): видео удаляются после набора и отправки отчётов; в журнале псевдонимные ID. Добавлена задача T-045.
- Q-10 отложен, на сайте заглушки вместо цен (D-021).
- Остаются открытыми: Q-6 (источник нормативов, блокирует T-044), Q-7 (порог расхождения тренеров, блокирует T-040), процентиль для родителя.
- Обновлены: decisions.md, TASKS.md, product.md, design.md, scoring.md, event-log.md, pricing.md, AGENTS.md.

### 2026-11-16 — Решения Q-1, Q-2, Q-3
- Добавлено: docs/scoring.md (D-014), docs/event-log.md (D-015), docs/pricing.md (D-016, D-017). Обновлены decisions.md, TASKS.md (новые T-008, T-044, обновлены T-014, T-032, T-040), product.md.
- Пересчитана точка безубыточности: в присланной модели цифры не сходятся (нужно ≈ 45–59 академий, а не 12–15), инфраструктура не учтена. См. docs/pricing.md и Q-10.
- Новые открытые вопросы Q-5..Q-10 в TASKS.md. Конфликты с референсом: шкала 1–5 против «87/100», спринт 20 м против 30 м.
- Файлы output/unit_economics.csv и output/breakeven.csv из присланного текста у нас недоступны; расчёты воспроизведены в pricing.md.

### 2026-11-16 — M0: архитектура и план
- Создано: AGENTS.md, ROADMAP.md, TASKS.md, PROGRESS.md, docs/product.md, docs/design.md, docs/architecture.md, docs/decisions.md, docs/reference/landing.webp.
- Установлены скиллы проекта в `.claude/skills/`: web-design-guidelines, react-best-practices, composition-patterns (из vercel-labs/agent-skills).
- Глобально установлен плагин everything-claude-code (команды, агенты, правила, навыки в `~/.claude`), команда `/ali` как вход. Хуки не включены (D-012).
- Решено: продукт — платформа отбора в футбольные академии (см. docs/product.md); ИИ-анализ — часть оценки.
- Не решено: Q-1..Q-4 в TASKS.md.

## Шаблон записи
```
### ГГГГ-ММ-ДД — T-XXX: название
- Что сделано:
- Какие файлы изменены:
- Что проверено (команды и результат):
- Что осталось / известные проблемы:
- Решения, которые нужно добавить в docs/decisions.md:
```
