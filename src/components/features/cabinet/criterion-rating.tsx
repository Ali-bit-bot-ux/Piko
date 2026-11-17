"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { interpolate } from "@/lib/i18n";

export type CriterionRatingTexts = {
  weight: string;
  myScore: string;
  noScore: string;
  scoreButtonAria: string;
  saving: string;
  saved: string;
  coachRatings: string;
  errors: Record<
    "invalid" | "forbidden" | "not_found" | "closed" | "generic",
    string
  >;
  scale: Record<"1" | "2" | "3" | "4" | "5", string>;
};

export type SaveRating = (input: {
  criterionKey: string;
  score: number;
  clientEventId: string;
  occurredAtDevice: string;
}) => Promise<
  { ok: true } | { ok: false; code: keyof CriterionRatingTexts["errors"] }
>;

const scores = [1, 2, 3, 4, 5] as const;

/** One criterion: big 1..5 buttons for the coach's own rating. */
export function CriterionRating({
  criterionKey,
  title,
  weight,
  initial,
  ratings,
  disabled,
  save,
  texts,
}: {
  criterionKey: string;
  title: string;
  weight: number;
  /** The signed-in coach's saved rating. */
  initial: number | null;
  /** Ratings of all coaches (numbers only). */
  ratings: readonly number[];
  disabled: boolean;
  save: SaveRating;
  texts: CriterionRatingTexts;
}) {
  const [score, setScore] = useState<number | null>(initial);
  const [message, setMessage] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);
  const [saving, startSaving] = useTransition();

  function choose(value: number) {
    if (disabled || saving || value === score) return;
    const previous = score;
    setScore(value);
    setMessage(null);
    startSaving(async () => {
      const result = await save({
        criterionKey,
        score: value,
        clientEventId: crypto.randomUUID(),
        occurredAtDevice: new Date().toISOString(),
      });
      if (result.ok) {
        setMessage({ kind: "ok", text: texts.saved });
      } else {
        setScore(previous);
        setMessage({ kind: "error", text: texts.errors[result.code] });
      }
    });
  }

  const legendId = `criterion-${criterionKey}`;

  return (
    <fieldset
      aria-describedby={`${legendId}-state`}
      className="flex flex-col gap-3 rounded-2xl border border-line p-4"
    >
      <legend className="px-1 text-base font-bold" id={legendId}>
        {title}
      </legend>
      <p className="text-sm text-ink-muted">
        {interpolate(texts.weight, { weight })}
      </p>

      <div className="grid grid-cols-5 gap-2">
        {scores.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={score === value}
            aria-label={interpolate(texts.scoreButtonAria, {
              criterion: title,
              score: value,
              meaning: texts.scale[String(value) as keyof typeof texts.scale],
            })}
            disabled={disabled || saving}
            onClick={() => choose(value)}
            className={cn(
              "min-h-14 rounded-xl border text-2xl font-bold tabular-nums transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              "disabled:pointer-events-none disabled:opacity-60",
              score === value
                ? "border-primary bg-primary text-white"
                : "border-line bg-surface text-ink hover:bg-surface-muted",
            )}
          >
            {value}
          </button>
        ))}
      </div>

      <p id={`${legendId}-state`} className="text-sm text-ink">
        {score === null
          ? texts.noScore
          : `${interpolate(texts.myScore, { score })} — ${
              texts.scale[String(score) as keyof typeof texts.scale]
            }`}
      </p>
      {ratings.length > 1 ? (
        <p className="text-sm text-ink-muted">
          {interpolate(texts.coachRatings, { list: ratings.join(", ") })}
        </p>
      ) : null}

      <p
        role={message?.kind === "error" ? "alert" : "status"}
        className={cn(
          "min-h-5 text-sm font-medium",
          message?.kind === "error" ? "text-danger" : "text-success",
        )}
      >
        {saving ? texts.saving : (message?.text ?? "")}
      </p>
    </fieldset>
  );
}
