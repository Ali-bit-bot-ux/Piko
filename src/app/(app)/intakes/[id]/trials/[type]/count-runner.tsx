"use client";

import { useRef, useState, useTransition } from "react";
import { Button, Card, Select } from "@/components/ui";
import { cn } from "@/lib/cn";
import { interpolate } from "@/lib/i18n";
import { recordMeasurementAction } from "./actions";
import { AttemptsPanel, type CorrectionTexts } from "./attempts-panel";
import type { RunnerCandidate, TrialRunnerTexts } from "./trial-runner";

export type CountRunnerTexts = {
  hint: string;
  pickLabel: string;
  optionLabel: string;
  save: string;
  saving: string;
  saved: string;
  attemptLine: string;
  best: string;
  chooseValue: string;
};

const MAX_ATTEMPTS = 2;
const COUNT_MAX = 10;
const options = Array.from({ length: COUNT_MAX + 1 }, (_, index) => index);

/** Passing and shooting: successes out of 10, two attempts, the best counts. */
export function CountRunner({
  intakeId,
  trialType,
  candidates: initial,
  texts,
  runnerTexts,
  correction,
}: {
  intakeId: string;
  trialType: "passing" | "shooting";
  candidates: RunnerCandidate[];
  texts: CountRunnerTexts;
  /** Shared labels of the stopwatch screen (candidate select, errors...). */
  runnerTexts: TrialRunnerTexts;
  correction: CorrectionTexts;
}) {
  const [candidates, setCandidates] = useState(initial);
  const [candidateId, setCandidateId] = useState("");
  const [count, setCount] = useState<number | null>(null);
  const [message, setMessage] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);
  const [saving, startSaving] = useTransition();
  // One id per save: sending it again (a retry) changes nothing.
  const eventId = useRef("");

  const selected = candidates.find((c) => c.candidateId === candidateId);
  const nextAttempt = selected ? selected.attempts.length + 1 : 1;
  const finished = selected ? nextAttempt > MAX_ATTEMPTS : false;
  const best =
    selected && selected.attempts.length > 0
      ? Math.max(...selected.attempts.map((a) => a.value))
      : null;

  function pick(value: number) {
    // A new pick is a new save; the same save keeps its id until it succeeds.
    if (!eventId.current) eventId.current = crypto.randomUUID();
    setCount(value);
    setMessage(null);
  }

  function save() {
    if (!selected) return;
    if (count === null) {
      setMessage({ kind: "error", text: texts.chooseValue });
      return;
    }
    const value = count;
    const attempt = nextAttempt;
    startSaving(async () => {
      const result = await recordMeasurementAction({
        intakeId,
        trialType,
        candidateId: selected.candidateId,
        attempt,
        value,
        clientEventId: eventId.current,
        occurredAtDevice: new Date().toISOString(),
      });
      if (result.ok) {
        setCandidates((current) =>
          current.map((c) =>
            c.candidateId === selected.candidateId &&
            !c.attempts.some((a) => a.attempt === attempt)
              ? {
                  ...c,
                  attempts: [
                    ...c.attempts,
                    { id: result.measurementId, attempt, value },
                  ],
                }
              : c,
          ),
        );
        setMessage({
          kind: "ok",
          text: interpolate(texts.saved, { value }),
        });
        setCount(null);
        eventId.current = "";
      } else {
        setMessage({ kind: "error", text: runnerTexts.errors[result.code] });
      }
    });
  }

  if (candidates.length === 0) {
    return (
      <Card variant="muted">
        <p className="text-ink-muted">{runnerTexts.noCandidates}</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-ink-muted">{texts.hint}</p>
      <Select
        label={runnerTexts.candidate}
        value={candidateId}
        onChange={(event) => {
          setCandidateId(event.target.value);
          setCount(null);
          setMessage(null);
          eventId.current = "";
        }}
        options={[
          { value: "", label: runnerTexts.choose },
          ...candidates.map((c) => ({
            value: c.candidateId,
            label: c.fullName,
          })),
        ]}
      />

      <Card className="flex flex-col gap-4">
        <div
          role="group"
          aria-label={texts.pickLabel}
          className="flex flex-col gap-3"
        >
          <span className="text-sm font-semibold">{texts.pickLabel}</span>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {options.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={count === value}
                aria-label={interpolate(texts.optionLabel, { value })}
                disabled={!selected || finished || saving}
                onClick={() => pick(value)}
                className={cn(
                  "min-h-14 rounded-xl border text-2xl font-bold tabular-nums transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  "disabled:pointer-events-none disabled:opacity-50",
                  count === value
                    ? "border-primary bg-primary text-white"
                    : "border-line bg-surface text-ink hover:bg-surface-muted",
                )}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <Button
          variant="accent"
          size="lg"
          className="min-h-14 w-full text-lg"
          onClick={save}
          disabled={!selected || finished || saving}
        >
          {saving
            ? texts.saving
            : interpolate(texts.save, { attempt: nextAttempt })}
        </Button>
        {selected && finished ? (
          <p className="text-sm text-ink-muted">{runnerTexts.allDone}</p>
        ) : null}
      </Card>

      {message ? (
        <p
          role={message.kind === "error" ? "alert" : "status"}
          className={
            message.kind === "error"
              ? "text-sm font-medium text-danger"
              : "text-sm font-medium text-success"
          }
        >
          {message.text}
        </p>
      ) : null}

      {selected ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-bold">{runnerTexts.attemptsTitle}</h2>
          {selected.attempts.length === 0 ? (
            <p className="text-sm text-ink-muted">{runnerTexts.noAttempts}</p>
          ) : (
            <AttemptsPanel
              intakeId={intakeId}
              kind="count"
              attempts={selected.attempts}
              lineTemplate={texts.attemptLine}
              texts={correction}
              onCorrected={(id, value) =>
                setCandidates((current) =>
                  current.map((c) => ({
                    ...c,
                    attempts: c.attempts.map((a) =>
                      a.id === id ? { ...a, value } : a,
                    ),
                  })),
                )
              }
            />
          )}
          {best !== null ? (
            <p className="text-sm font-semibold text-primary">
              {interpolate(texts.best, { value: best })}
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
