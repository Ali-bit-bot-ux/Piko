"use client";

import { useRef, useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { cn } from "@/lib/cn";
import { APP_TIME_ZONE, formatDate } from "@/lib/format";
import { interpolate } from "@/lib/i18n";
import { FRAME_COUNT_DEFAULT, FRAME_COUNT_MAX } from "@/lib/video-frames";
import type { Dictionary } from "@/lib/i18n";
import { ExtractError, extractFrames } from "./extract-frames";
import type { SaveRating } from "./criterion-rating";

export type AnalysisSuggestion = {
  criterionKey: string;
  score: number;
  comment: string;
};

/** Saved or fresh analysis as the panel shows it (dates as ISO strings). */
export type AnalysisView = {
  provider: string;
  createdAt: string;
  suggestions: AnalysisSuggestion[];
  summary: string;
  keyMoments: { timeSec: number; description: string }[];
};

export type AnalysisCriterion = {
  key: string;
  title: string;
  /** The signed-in coach's saved rating. */
  mine: number | null;
};

type Texts = Dictionary["analysis"];

type Phase =
  | { name: "idle" }
  | { name: "cutting"; done: number; total: number }
  | { name: "sending" };

const scores = [1, 2, 3, 4, 5] as const;

/**
 * AI hints from a video chosen on this device. The browser cuts the frames and
 * sends only them; the coach accepts or changes each suggested score (D-019).
 */
export function AnalysisPanel({
  intakeId,
  candidateId,
  criteria,
  initial,
  disabled,
  save,
  texts,
  scale,
}: {
  intakeId: string;
  candidateId: string;
  criteria: readonly AnalysisCriterion[];
  initial: AnalysisView | null;
  disabled: boolean;
  save: SaveRating;
  texts: Texts;
  scale: Record<"1" | "2" | "3" | "4" | "5", string>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [count, setCount] = useState(FRAME_COUNT_DEFAULT);
  const [phase, setPhase] = useState<Phase>({ name: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisView | null>(initial);
  const [fresh, setFresh] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const busy = phase.name !== "idle";

  async function start() {
    if (!file) {
      setError(texts.noFile);
      return;
    }
    setError(null);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      setPhase({ name: "cutting", done: 0, total: count });
      const frames = await extractFrames(file, count, {
        signal: controller.signal,
        onProgress: (done, total) => setPhase({ name: "cutting", done, total }),
      });

      setPhase({ name: "sending" });
      const form = new FormData();
      form.append("intakeId", intakeId);
      form.append("candidateId", candidateId);
      for (const frame of frames) {
        form.append("frame", frame.blob, "frame.jpg");
        form.append("time", String(frame.timeSec));
      }
      const response = await fetch("/api/analysis", {
        method: "POST",
        body: form,
        signal: controller.signal,
      });
      const body = (await response.json().catch(() => null)) as
        | {
            ok: true;
            analysis: {
              provider: string;
              createdAt: string;
              result: Omit<AnalysisView, "provider" | "createdAt"> & {
                usage: unknown;
              };
            };
          }
        | { ok: false; code: string }
        | null;
      if (!body || !body.ok) {
        const code = body && !body.ok ? body.code : "generic";
        setError(
          texts.errors[code as keyof typeof texts.errors] ??
            texts.errors.generic,
        );
        return;
      }
      const { provider, createdAt, result } = body.analysis;
      setAnalysis({
        provider,
        createdAt,
        suggestions: result.suggestions,
        summary: result.summary,
        keyMoments: result.keyMoments,
      });
      setFresh(true);
    } catch (caught) {
      if (caught instanceof ExtractError) {
        setError(
          caught.code === "cancelled"
            ? texts.cancelled
            : texts.errors[caught.code],
        );
      } else if (caught instanceof DOMException && caught.name === "AbortError") {
        setError(texts.cancelled);
      } else {
        setError(texts.errors.generic);
      }
    } finally {
      abortRef.current = null;
      setPhase({ name: "idle" });
    }
  }

  const byKey = new Map(analysis?.suggestions.map((s) => [s.criterionKey, s]));

  return (
    <section
      aria-labelledby="analysis-title"
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="analysis-title" className="text-lg font-bold tracking-tight">
            {texts.title}
          </h2>
          {analysis?.provider === "stub" ? (
            <Badge variant="neutral">{texts.demo}</Badge>
          ) : null}
        </div>
        <p className="text-ink-muted">{texts.notice}</p>
      </div>

      {disabled ? (
        <p className="text-ink-muted">{texts.closed}</p>
      ) : (
        <Card className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="analysis-file" className="text-sm font-semibold">
              {texts.fileLabel}
            </label>
            <input
              id="analysis-file"
              type="file"
              accept="video/*"
              disabled={busy}
              aria-describedby="analysis-file-hint"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setError(null);
              }}
              className="min-h-11 w-full rounded-xl border border-line bg-surface p-2 text-sm file:mr-3 file:min-h-9 file:rounded-full file:border-0 file:bg-surface-muted file:px-4 file:font-semibold focus-visible:outline-2 focus-visible:outline-primary"
            />
            <p id="analysis-file-hint" className="text-sm text-ink-muted">
              {file
                ? interpolate(texts.fileChosen, { name: file.name })
                : texts.fileHint}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="analysis-count" className="text-sm font-semibold">
              {texts.countLabel}
            </label>
            <input
              id="analysis-count"
              type="number"
              inputMode="numeric"
              min={1}
              max={FRAME_COUNT_MAX}
              value={count}
              disabled={busy}
              aria-describedby="analysis-count-hint"
              onChange={(event) => {
                const value = Math.round(Number(event.target.value));
                if (Number.isFinite(value)) {
                  setCount(Math.min(FRAME_COUNT_MAX, Math.max(1, value)));
                }
              }}
              className="min-h-11 w-28 rounded-xl border border-line bg-surface px-3 text-base tabular-nums focus-visible:outline-2 focus-visible:outline-primary"
            />
            <p id="analysis-count-hint" className="text-sm text-ink-muted">
              {interpolate(texts.countHint, { max: FRAME_COUNT_MAX })}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={start} disabled={busy}>
              {texts.submit}
            </Button>
            {busy ? (
              <Button
                variant="secondary"
                onClick={() => abortRef.current?.abort()}
              >
                {texts.cancel}
              </Button>
            ) : null}
          </div>

          {phase.name === "cutting" ? (
            <div className="flex flex-col gap-1.5" role="status">
              <p className="text-sm font-medium">
                {interpolate(texts.cutting, {
                  done: phase.done,
                  total: phase.total,
                })}
              </p>
              <progress
                className="h-2 w-full"
                aria-label={texts.progressLabel}
                value={phase.done}
                max={phase.total}
              />
            </div>
          ) : null}
          {phase.name === "sending" ? (
            <p role="status" className="text-sm font-medium">
              {texts.sending}
            </p>
          ) : null}
          <p role="alert" className="min-h-5 text-sm font-medium text-danger">
            {error ?? ""}
          </p>
        </Card>
      )}

      {analysis ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-bold">{texts.resultTitle}</h3>
            <p className="text-sm text-ink-muted">
              {interpolate(texts.resultMeta, {
                date: formatDate(
                  new Date(analysis.createdAt),
                  "ru-RU",
                  APP_TIME_ZONE,
                ),
              })}
            </p>
            {fresh ? (
              <p role="status" className="text-sm font-medium text-success">
                {texts.resultFresh}
              </p>
            ) : null}
          </div>

          <Card variant="muted" className="flex flex-col gap-2">
            <h4 className="text-sm font-bold">{texts.summaryTitle}</h4>
            <p>{analysis.summary}</p>
            {analysis.keyMoments.length > 0 ? (
              <>
                <h4 className="mt-2 text-sm font-bold">{texts.momentsTitle}</h4>
                <ul className="flex flex-col gap-1 text-sm">
                  {analysis.keyMoments.map((moment, index) => (
                    <li key={index}>
                      <span className="font-semibold tabular-nums">
                        {interpolate(texts.momentAt, {
                          time: moment.timeSec.toFixed(1),
                        })}
                      </span>
                      {": "}
                      {moment.description}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </Card>

          {criteria.map((criterion) => (
            <SuggestionRow
              key={`${criterion.key}-${analysis.createdAt}`}
              criterion={criterion}
              suggestion={byKey.get(criterion.key) ?? null}
              disabled={disabled}
              save={save}
              texts={texts}
              scale={scale}
            />
          ))}
        </div>
      ) : null}

      <p className="text-sm text-ink-muted">{texts.privacy}</p>
    </section>
  );
}

function SuggestionRow({
  criterion,
  suggestion,
  disabled,
  save,
  texts,
  scale,
}: {
  criterion: AnalysisCriterion;
  suggestion: AnalysisSuggestion | null;
  disabled: boolean;
  save: SaveRating;
  texts: Texts;
  scale: Record<"1" | "2" | "3" | "4" | "5", string>;
}) {
  const [choice, setChoice] = useState<number | null>(
    suggestion?.score ?? null,
  );
  const [savedScore, setSavedScore] = useState<number | null>(criterion.mine);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!suggestion) {
    return (
      <div className="rounded-2xl border border-line p-4">
        <p className="font-bold">{criterion.title}</p>
        <p className="text-sm text-ink-muted">{texts.noSuggestion}</p>
      </div>
    );
  }

  const label =
    choice === suggestion.score
      ? texts.accept
      : interpolate(texts.acceptOther, { score: choice ?? "" });
  const alreadySaved = choice !== null && choice === savedScore;

  async function accept() {
    if (choice === null || pending || disabled) return;
    setPending(true);
    setError(null);
    try {
      const result = await save({
        criterionKey: criterion.key,
        score: choice,
        clientEventId: crypto.randomUUID(),
        occurredAtDevice: new Date().toISOString(),
      });
      if (result.ok) {
        setSavedScore(choice);
      } else {
        setError(texts.rateErrors[result.code]);
      }
    } catch {
      setError(texts.rateErrors.generic);
    } finally {
      setPending(false);
    }
  }

  return (
    <fieldset className="flex flex-col gap-3 rounded-2xl border border-line p-4">
      <legend className="px-1 text-base font-bold">{criterion.title}</legend>
      <p className="font-semibold">
        {interpolate(texts.suggestedLine, { score: suggestion.score })}
      </p>
      <p className="text-ink-muted">{suggestion.comment}</p>

      <p className="text-sm font-semibold">{texts.chooseScore}</p>
      <div className="grid grid-cols-5 gap-2">
        {scores.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={choice === value}
            aria-label={interpolate(texts.scoreButtonAria, {
              criterion: criterion.title,
              score: `${value}, ${scale[String(value) as keyof typeof scale]}`,
            })}
            disabled={disabled || pending}
            onClick={() => {
              setChoice(value);
            }}
            className={cn(
              "min-h-12 rounded-xl border text-xl font-bold tabular-nums transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              "disabled:pointer-events-none disabled:opacity-60",
              choice === value
                ? "border-primary bg-primary text-white"
                : "border-line bg-surface text-ink hover:bg-surface-muted",
            )}
          >
            {value}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={accept}
          disabled={disabled || pending || choice === null || alreadySaved}
        >
          {pending ? texts.accepting : label}
        </Button>
        <p
          role={error ? "alert" : "status"}
          className={cn(
            "text-sm font-medium",
            error ? "text-danger" : "text-success",
          )}
        >
          {error ??
            (alreadySaved
              ? interpolate(texts.accepted, { score: savedScore ?? "" })
              : "")}
        </p>
      </div>
    </fieldset>
  );
}
