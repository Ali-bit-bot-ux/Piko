"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button, Card, Select } from "@/components/ui";
import { interpolate } from "@/lib/i18n";
import { formatStopwatch, toSeconds } from "@/lib/stopwatch";
import { recordMeasurementAction } from "./actions";
import {
  AttemptsPanel,
  type CorrectionTexts,
  type SavedAttempt,
} from "./attempts-panel";

export type RunnerCandidate = {
  candidateId: string;
  fullName: string;
  attempts: SavedAttempt[];
};

export type TrialRunnerTexts = {
  candidate: string;
  choose: string;
  noCandidates: string;
  start: string;
  stop: string;
  reset: string;
  save: string;
  saving: string;
  saved: string;
  attemptsTitle: string;
  attemptLine: string;
  noAttempts: string;
  best: string;
  allDone: string;
  timerLabel: string;
  errors: Record<
    | "invalid"
    | "forbidden"
    | "not_found"
    | "closed"
    | "attempt_taken"
    | "generic",
    string
  >;
};

type Phase = "idle" | "running" | "stopped";

const MAX_ATTEMPTS = 2;

export function TrialRunner({
  intakeId,
  trialType,
  candidates: initial,
  texts,
  correction,
}: {
  intakeId: string;
  trialType: "sprint_20m" | "shuttle_5_10_5" | "dribbling";
  candidates: RunnerCandidate[];
  texts: TrialRunnerTexts;
  correction: CorrectionTexts;
}) {
  const [candidates, setCandidates] = useState(initial);
  const [candidateId, setCandidateId] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [message, setMessage] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);
  const [saving, startSaving] = useTransition();

  const startedAt = useRef(0);
  // One id per saved result: sending it again (a retry) changes nothing.
  const eventId = useRef<string>("");

  // The clock is the difference of timestamps; the interval only redraws it.
  useEffect(() => {
    if (phase !== "running") return;
    const timer = setInterval(() => {
      setElapsed(performance.now() - startedAt.current);
    }, 30);
    return () => clearInterval(timer);
  }, [phase]);

  const selected = candidates.find((c) => c.candidateId === candidateId);
  const nextAttempt = selected ? selected.attempts.length + 1 : 1;
  const finished = selected ? nextAttempt > MAX_ATTEMPTS : false;
  const best =
    selected && selected.attempts.length > 0
      ? Math.min(...selected.attempts.map((a) => a.value))
      : null;

  function start() {
    setMessage(null);
    eventId.current = crypto.randomUUID();
    startedAt.current = performance.now();
    setElapsed(0);
    setPhase("running");
  }

  function stop() {
    setElapsed(performance.now() - startedAt.current);
    setPhase("stopped");
  }

  function reset() {
    setPhase("idle");
    setElapsed(0);
    setMessage(null);
  }

  function save() {
    if (!selected) return;
    const value = toSeconds(elapsed);
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
          text: interpolate(texts.saved, { value: value.toFixed(2) }),
        });
        setPhase("idle");
        setElapsed(0);
      } else {
        setMessage({ kind: "error", text: texts.errors[result.code] });
      }
    });
  }

  if (candidates.length === 0) {
    return (
      <Card variant="muted">
        <p className="text-ink-muted">{texts.noCandidates}</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Select
        label={texts.candidate}
        value={candidateId}
        onChange={(event) => {
          setCandidateId(event.target.value);
          reset();
        }}
        disabled={phase === "running"}
        options={[
          { value: "", label: texts.choose },
          ...candidates.map((c) => ({
            value: c.candidateId,
            label: c.fullName,
          })),
        ]}
      />

      <Card
        variant="dark"
        role="group"
        aria-label={texts.timerLabel}
        className="flex flex-col items-center gap-5 py-8"
      >
        <output
          aria-live="off"
          className="font-mono text-6xl font-bold tabular-nums tracking-tight sm:text-7xl"
        >
          {formatStopwatch(elapsed)}
        </output>

        {phase === "idle" ? (
          <Button
            variant="accent"
            size="lg"
            className="min-h-16 w-full max-w-xs text-xl"
            onClick={start}
            disabled={!selected || finished}
          >
            {texts.start}
          </Button>
        ) : null}

        {phase === "running" ? (
          <Button
            size="lg"
            className="min-h-16 w-full max-w-xs bg-danger text-xl text-white hover:bg-danger"
            onClick={stop}
          >
            {texts.stop}
          </Button>
        ) : null}

        {phase === "stopped" ? (
          <div className="flex w-full max-w-xs flex-col gap-3">
            <Button
              variant="accent"
              size="lg"
              className="min-h-16 text-xl"
              onClick={save}
              disabled={saving}
            >
              {saving
                ? texts.saving
                : interpolate(texts.save, { attempt: nextAttempt })}
            </Button>
            <Button
              variant="secondary"
              onClick={reset}
              disabled={saving}
              className="border-white/30 bg-transparent text-white hover:bg-white/10"
            >
              {texts.reset}
            </Button>
          </div>
        ) : null}

        {selected && finished ? (
          <p className="text-sm text-white/80">{texts.allDone}</p>
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
          <h2 className="text-base font-bold">{texts.attemptsTitle}</h2>
          {selected.attempts.length === 0 ? (
            <p className="text-sm text-ink-muted">{texts.noAttempts}</p>
          ) : (
            <AttemptsPanel
              intakeId={intakeId}
              kind="time"
              attempts={selected.attempts}
              lineTemplate={texts.attemptLine}
              texts={correction}
              onCorrected={(id, value) => {
                setMessage(null);
                setCandidates((current) =>
                  current.map((c) => ({
                    ...c,
                    attempts: c.attempts.map((a) =>
                      a.id === id ? { ...a, value } : a,
                    ),
                  })),
                );
              }}
            />
          )}
          {best !== null ? (
            <p className="text-sm font-semibold text-primary">
              {interpolate(texts.best, { value: best.toFixed(2) })}
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
