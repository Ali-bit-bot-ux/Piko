import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Card } from "@/components/ui";
import { getDictionary } from "@/lib/i18n";
import { intakePath } from "@/lib/routes";
import { requireStaff } from "@/server/auth/session";
import { findIntakeForUser } from "@/server/db/intakes";
import { listTrialProgress } from "@/server/db/measurements";
import { isTimedTrial, trialTypes } from "@/server/trials/record-measurement";
import { CountRunner } from "./count-runner";
import { TrialRunner } from "./trial-runner";

const { trials: t, results } = getDictionary();

export const metadata: Metadata = {
  title: t.title,
  robots: { index: false, follow: false },
};

export default async function TrialPage(
  props: PageProps<"/intakes/[id]/trials/[type]">,
) {
  const user = await requireStaff();
  const { id, type } = await props.params;

  const trialType = z.enum(trialTypes).safeParse(type);
  if (!z.uuid().safeParse(id).success || !trialType.success) notFound();

  // Another academy's intake looks exactly like a missing one.
  const intake = await findIntakeForUser(user, id);
  if (!intake) notFound();
  const progress = await listTrialProgress(user, intake.id, trialType.data);
  if (!progress) notFound();

  const open = intake.status === "open" || intake.status === "testing";
  // Unsent results wait in the browser under this key: per user and intake.
  const queueKey = `piko.queue.v1:${user.id}:${intake.id}`;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <Link
        href={intakePath(intake.id)}
        className="inline-flex min-h-11 w-fit items-center text-sm font-semibold text-primary focus-visible:outline-2 focus-visible:outline-primary"
      >
        ← {t.back}
      </Link>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">
          {t.types[trialType.data]}
        </h1>
        <p className="text-sm text-ink-muted">{intake.name}</p>
      </div>

      {open ? (
        isTimedTrial(trialType.data) ? (
          <TrialRunner
            queueKey={queueKey}
            intakeId={intake.id}
            trialType={trialType.data}
            candidates={progress}
            texts={t.runner}
            correction={results.correction}
          />
        ) : (
          <CountRunner
            queueKey={queueKey}
            intakeId={intake.id}
            trialType={trialType.data}
            candidates={progress}
            texts={results.counts}
            runnerTexts={t.runner}
            correction={results.correction}
          />
        )
      ) : (
        <Card variant="muted">
          <p className="text-ink-muted">{t.notOpen}</p>
        </Card>
      )}
    </div>
  );
}
