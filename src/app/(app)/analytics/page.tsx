import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui";
import { getDictionary, interpolate } from "@/lib/i18n";
import { requireStaff } from "@/server/auth/session";
import { percent, type IntakeMetrics } from "@/server/analytics/summarize";
import { getAnalyticsForUser } from "@/server/db/analytics";

const { analytics: t, results } = getDictionary();

export const metadata: Metadata = {
  title: t.title,
  robots: { index: false, follow: false },
};

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="text-2xl font-bold tabular-nums">{value}</dd>
      {hint ? <p className="text-xs text-ink-muted">{hint}</p> : null}
    </div>
  );
}

function MetricsBlock({ m }: { m: IntakeMetrics }) {
  const share = (part: number) => {
    const value = percent(part, m.candidates);
    return value === null
      ? undefined
      : interpolate(t.funnel.ofCandidates, { percent: value });
  };
  const openRate = percent(m.reportsOpened, m.reportsSent);

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <section aria-label={t.funnel.title} className="flex flex-col gap-3">
        <h3 className="font-semibold">{t.funnel.title}</h3>
        <dl className="grid grid-cols-2 gap-4">
          <Stat label={t.funnel.candidates} value={m.candidates} />
          <Stat
            label={t.funnel.withResults}
            value={m.withResults}
            hint={share(m.withResults)}
          />
          <Stat label={t.funnel.rated} value={m.rated} hint={share(m.rated)} />
          <Stat
            label={t.funnel.scored}
            value={m.scored}
            hint={share(m.scored)}
          />
        </dl>
      </section>

      <section aria-label={t.quality.title} className="flex flex-col gap-3">
        <h3 className="font-semibold">{t.quality.title}</h3>
        <dl className="grid grid-cols-2 gap-4">
          <Stat
            label={t.quality.averageTotal}
            value={
              m.averageTotal === null ? t.noData : m.averageTotal.toFixed(2)
            }
          />
          <Stat
            label={t.quality.disagreements}
            value={m.strongDisagreements}
            hint={interpolate(t.quality.disagreementsHint, {
              count: m.strongDisagreements,
              scored: m.scored,
            })}
          />
        </dl>
        <h3 className="mt-2 font-semibold">{t.decisions.title}</h3>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          {(Object.keys(m.decisions) as (keyof typeof m.decisions)[]).map(
            (key) => (
              <div key={key} className="flex justify-between gap-2">
                <dt className="text-ink-muted">{results.decisions[key]}</dt>
                <dd className="font-semibold tabular-nums">
                  {m.decisions[key]}
                </dd>
              </div>
            ),
          )}
        </dl>
      </section>

      <section aria-label={t.reports.title} className="flex flex-col gap-3">
        <h3 className="font-semibold">{t.reports.title}</h3>
        <dl className="grid grid-cols-3 gap-4">
          <Stat label={t.reports.created} value={m.reportsCreated} />
          <Stat label={t.reports.sent} value={m.reportsSent} />
          <Stat
            label={t.reports.opened}
            value={m.reportsOpened}
            hint={
              openRate === null
                ? undefined
                : interpolate(t.reports.openRate, { percent: openRate })
            }
          />
        </dl>
      </section>

      <section aria-label={t.ai.title} className="flex flex-col gap-3">
        <h3 className="font-semibold">{t.ai.title}</h3>
        <dl className="grid grid-cols-2 gap-4">
          <Stat label={t.ai.runs} value={m.analysisRuns} />
          <Stat label={t.ai.tokens} value={m.analysisTokens} />
        </dl>
      </section>
    </div>
  );
}

// Directors and admins only: numbers of the academy, no names of children.
export default async function AnalyticsPage() {
  const user = await requireStaff();
  const data = await getAnalyticsForUser(user);
  if (!data) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
        <p className="text-ink-muted">{t.intro}</p>
      </div>

      {data.perIntake.length === 0 ? (
        <Card variant="muted">
          <p className="text-ink-muted">{t.empty}</p>
        </Card>
      ) : (
        <>
          <Card className="flex flex-col gap-4">
            <h2 className="text-lg font-bold tracking-tight">{t.totalTitle}</h2>
            <MetricsBlock m={data.total} />
          </Card>
          {data.perIntake.map(({ intake, metrics }) => (
            <Card key={intake.id} className="flex flex-col gap-4">
              <h2 className="text-lg font-bold tracking-tight">
                {interpolate(t.intakeTitle, { name: intake.name })}
              </h2>
              <MetricsBlock m={metrics} />
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
