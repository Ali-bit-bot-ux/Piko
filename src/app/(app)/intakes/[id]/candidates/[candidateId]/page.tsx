import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ReportPanel } from "@/components/features/cabinet/report-panel";
import { CriterionRating } from "@/components/features/cabinet/criterion-rating";
import { ScoreSummary } from "@/components/features/cabinet/score-summary";
import { Badge, Card } from "@/components/ui";
import { contactHref } from "@/lib/contact";
import { formatDate } from "@/lib/format";
import { getDictionary, interpolate } from "@/lib/i18n";
import { intakePath } from "@/lib/routes";
import { requireStaff } from "@/server/auth/session";
import { getCandidateResultForUser } from "@/server/db/candidate-results";
import { scoreCriterionAction } from "./actions";

const { results, candidates, trials } = getDictionary();
const { candidate: t, criteria: criterionTitles, scale } = results;

export const metadata: Metadata = {
  title: t.evaluationTitle,
  robots: { index: false, follow: false },
};

export default async function CandidateResultPage(
  props: PageProps<"/intakes/[id]/candidates/[candidateId]">,
) {
  const user = await requireStaff();
  const { id, candidateId } = await props.params;
  if (
    !z.uuid().safeParse(id).success ||
    !z.uuid().safeParse(candidateId).success
  ) {
    notFound();
  }

  // Another academy's data looks exactly like a missing page.
  const view = await getCandidateResultForUser(user, id, candidateId);
  if (!view) notFound();
  const { candidate, intake, criteria } = view;

  const contact = contactHref(candidate.parentContact);
  const rated = criteria.filter((c) => c.ratings.length > 0).length;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Link
        href={intakePath(intake.id)}
        className="inline-flex min-h-11 w-fit items-center text-sm font-semibold text-primary focus-visible:outline-2 focus-visible:outline-primary"
      >
        ← {t.back}
      </Link>

      <Card className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h1 className="text-2xl font-bold tracking-tight">
            {candidate.fullName}
          </h1>
          <Badge
            variant={candidate.status === "registered" ? "neutral" : "success"}
          >
            {candidates.status[candidate.status]}
          </Badge>
        </div>
        <p className="text-sm text-ink-muted">{intake.name}</p>
        <div className="flex flex-col gap-1 text-sm text-ink-muted">
          <p>
            {interpolate(t.birthDate, {
              date: formatDate(candidate.birthDate),
            })}
          </p>
          <p>{interpolate(t.parent, { name: candidate.parentName })}</p>
          <p>
            {contact ? (
              <a
                href={contact}
                className="inline-flex min-h-11 items-center text-primary underline focus-visible:outline-2 focus-visible:outline-primary"
              >
                {candidate.parentContact}
              </a>
            ) : (
              candidate.parentContact
            )}
          </p>
        </div>
      </Card>

      <ScoreSummary score={view.score} rated={rated} total={criteria.length} />

      <Card className="flex flex-col gap-3">
        <h2 className="text-lg font-bold tracking-tight">{t.trialsTitle}</h2>
        {view.trials.length === 0 ? (
          <p className="text-ink-muted">{t.trialsEmpty}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {view.trials.map((trial) => {
              const template = trial.timed ? t.trialSeconds : t.trialCount;
              return (
                <li key={trial.type} className="flex flex-col gap-0.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-semibold">
                      {trials.types[trial.type]}
                    </span>
                    <span className="text-lg font-bold tabular-nums">
                      {interpolate(template, {
                        value:
                          trial.best === null
                            ? ""
                            : trial.timed
                              ? trial.best.toFixed(2)
                              : trial.best,
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-ink-muted">
                    {interpolate(t.trialAttempts, {
                      list: trial.attempts
                        .map((a) =>
                          trial.timed ? a.value.toFixed(2) : String(a.value),
                        )
                        .join(", "),
                    })}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <section
        className="flex flex-col gap-4"
        aria-labelledby="evaluation-title"
      >
        <div className="flex flex-col gap-1">
          <h2
            id="evaluation-title"
            className="text-lg font-bold tracking-tight"
          >
            {t.evaluationTitle}
          </h2>
          <p className="text-ink-muted">
            {view.canScore ? t.evaluationHint : t.closed}
          </p>
        </div>
        {criteria.map((criterion) => (
          <CriterionRating
            key={criterion.key}
            criterionKey={criterion.key}
            title={
              criterionTitles[criterion.key as keyof typeof criterionTitles]
            }
            weight={criterion.weight}
            initial={criterion.mine}
            ratings={criterion.ratings}
            disabled={!view.canScore}
            save={scoreCriterionAction.bind(null, intake.id, candidate.id)}
            texts={{
              weight: t.weight,
              myScore: t.myScore,
              noScore: t.noScore,
              scoreButtonAria: t.scoreButtonAria,
              saving: t.saving,
              saved: t.saved,
              coachRatings: t.coachRatings,
              errors: results.candidate.errors,
              scale,
            }}
          />
        ))}
      </section>

      <ReportPanel
        user={user}
        intakeId={intake.id}
        candidateId={candidate.id}
        parentContact={candidate.parentContact}
      />
    </div>
  );
}
