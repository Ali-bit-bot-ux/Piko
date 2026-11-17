import { Badge, Card, ScoreRing } from "@/components/ui";
import type { BadgeVariant } from "@/components/ui";
import { APP_TIME_ZONE, formatDate } from "@/lib/format";
import { getDictionary, interpolate } from "@/lib/i18n";
import type { PublicReport } from "@/server/reports";
import { PrintButton } from "./print-button";

const decisionVariant: Record<PublicReport["decision"], BadgeVariant> = {
  enrolled: "success",
  reserve: "accent",
  review: "warning",
  rejected: "neutral",
};

type Phrases = Record<string, string>;

/** Parent-facing report: friendly, no ranking, no comparison with others. */
export function ReportView({ report }: { report: PublicReport }) {
  const { report: t, results } = getDictionary();
  const titles: Phrases = results.criteria;
  const strengthPhrases: Phrases = t.strengths;
  const growthPhrases: Phrases = t.growth;
  const levels: Phrases = t.levels;

  return (
    <article className="flex w-full max-w-2xl flex-col gap-5 print:max-w-none print:gap-4">
      <header className="flex flex-col gap-1">
        <p className="text-sm font-semibold text-ink-muted">{t.page.heading}</p>
        <h1 className="text-3xl font-bold tracking-tight">
          {report.childName}
        </h1>
        <p className="text-ink-muted">
          {interpolate(t.page.intro, { academy: report.academyName })}
        </p>
      </header>

      <Card className="flex flex-wrap items-center gap-5 print:break-inside-avoid">
        <ScoreRing value={report.total} label={t.page.totalLabel} size="lg" />
        <div className="flex flex-col gap-2">
          <p className="text-sm text-ink-muted">{t.page.totalNote}</p>
          <p className="text-sm font-semibold">{t.page.statusTitle}</p>
          <Badge variant={decisionVariant[report.decision]} className="w-fit">
            {results.decisions[report.decision]}
          </Badge>
          <p className="max-w-sm text-ink-muted">
            {t.decisionNotes[report.decision]}
          </p>
        </div>
      </Card>

      <Card className="flex flex-col gap-3 print:break-inside-avoid">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-bold tracking-tight">
            {t.page.skillsTitle}
          </h2>
          <p className="text-sm text-ink-muted">{t.page.skillsHint}</p>
        </div>
        <ul className="flex flex-col gap-3">
          {report.criteria.map((c) => (
            <li key={c.key} className="flex flex-col gap-1">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-semibold">{titles[c.key] ?? c.key}</span>
                <span className="font-bold tabular-nums">
                  {interpolate(t.page.scoreLine, { score: c.score })}
                </span>
              </div>
              <div
                aria-hidden
                className="h-2 overflow-hidden rounded-full bg-surface-muted"
              >
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${(c.score / 5) * 100}%` }}
                />
              </div>
              <p className="text-sm text-ink-muted">
                {levels[String(Math.floor(c.score))]}
              </p>
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid gap-5 sm:grid-cols-2 print:grid-cols-2">
        <Card className="flex flex-col gap-3 print:break-inside-avoid">
          <h2 className="text-lg font-bold tracking-tight">
            {t.page.strengthsTitle}
          </h2>
          {report.strengths.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {report.strengths.map((key) => (
                <li key={key} className="flex flex-col gap-0.5">
                  <span className="font-semibold">{titles[key]}</span>
                  <span className="text-ink-muted">{strengthPhrases[key]}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-muted">{t.page.strengthsEmpty}</p>
          )}
        </Card>
        <Card className="flex flex-col gap-3 print:break-inside-avoid">
          <h2 className="text-lg font-bold tracking-tight">
            {t.page.growthTitle}
          </h2>
          {report.growth.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {report.growth.map((key) => (
                <li key={key} className="flex flex-col gap-0.5">
                  <span className="font-semibold">{titles[key]}</span>
                  <span className="text-ink-muted">{growthPhrases[key]}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-muted">{t.page.growthEmpty}</p>
          )}
        </Card>
      </div>

      <footer className="flex flex-col gap-3 print:break-inside-avoid">
        <p className="text-sm text-ink-muted">{t.page.footnote}</p>
        <p className="text-sm text-ink-muted">
          {interpolate(t.page.expires, {
            date: formatDate(report.expiresAt, "ru-RU", APP_TIME_ZONE),
          })}
        </p>
        <div className="flex flex-col gap-1 print:hidden">
          <PrintButton label={t.page.print} />
          <p className="text-sm text-ink-muted">{t.page.printHint}</p>
        </div>
      </footer>
    </article>
  );
}
