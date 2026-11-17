import { Badge, Card, ScoreRing } from "@/components/ui";
import type { BadgeVariant } from "@/components/ui";
import { getDictionary, interpolate } from "@/lib/i18n";
import type { DecisionKey, ScoreResult } from "@/server/scoring";
import { DISAGREEMENT_THRESHOLD } from "@/server/scoring";

const decisionVariant: Record<DecisionKey, BadgeVariant> = {
  enrolled: "success",
  reserve: "accent",
  review: "warning",
  rejected: "danger",
};

/** Total (ring), decision status and the difference of coaches' opinions. */
export function ScoreSummary({
  score,
  rated,
  total,
}: {
  /** Null until every criterion of the profile has a rating. */
  score: ScoreResult | null;
  rated: number;
  total: number;
}) {
  const { candidate: t, criteria, decisions } = getDictionary().results;
  const disagreements = score?.criteria.filter(
    (c) => c.spread >= DISAGREEMENT_THRESHOLD,
  );

  return (
    <Card className="flex flex-col gap-5">
      <h2 className="text-lg font-bold tracking-tight">{t.resultTitle}</h2>

      {score ? (
        <div className="flex flex-wrap items-center gap-5">
          <ScoreRing value={score.total} label={t.totalLabel} size="lg" />
          <div className="flex flex-col gap-2">
            <Badge variant={decisionVariant[score.decision]} className="w-fit">
              {decisions[score.decision]}
            </Badge>
            {score.hasLowCriterion ? (
              <p className="max-w-xs text-sm text-ink-muted">
                {t.lowCriterionNote}
              </p>
            ) : null}
            <p className="max-w-xs text-sm text-ink-muted">{t.aiNote}</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <p className="text-ink-muted">{t.incomplete}</p>
          <p className="text-sm font-semibold">
            {interpolate(t.progress, { done: rated, total })}
          </p>
        </div>
      )}

      {score ? (
        <section
          aria-labelledby="disagreement-title"
          className="flex flex-col gap-2"
        >
          <h3 id="disagreement-title" className="text-base font-bold">
            {t.disagreementTitle}
          </h3>
          {disagreements && disagreements.length > 0 ? (
            <>
              <ul className="flex flex-col gap-1 text-sm">
                {disagreements.map((c) => (
                  <li key={c.key}>
                    {interpolate(t.disagreementLine, {
                      criterion: criteria[c.key as keyof typeof criteria],
                      min: c.ratings[0],
                      max: c.ratings[c.ratings.length - 1],
                    })}
                  </li>
                ))}
              </ul>
              <p className="text-sm text-ink-muted">
                {interpolate(t.disagreementNote, {
                  threshold: DISAGREEMENT_THRESHOLD,
                })}
              </p>
            </>
          ) : (
            <p className="text-sm text-ink-muted">{t.disagreementNone}</p>
          )}
        </section>
      ) : null}
    </Card>
  );
}
