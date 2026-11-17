"use client";

import { useRef, useState, useTransition } from "react";
import { Button, Input } from "@/components/ui";
import { interpolate } from "@/lib/i18n";
import type { Attempt } from "@/lib/trial-attempts";
import { correctMeasurementAction } from "./actions";

/** A saved result; `pending` ones are still only on the phone (no connection). */
export type SavedAttempt = Attempt;

export type CorrectionTexts = {
  fix: string;
  titleLine: string;
  newValue: string;
  reason: string;
  reasonHint: string;
  submit: string;
  saving: string;
  cancel: string;
  done: string;
  errors: Record<
    | "invalid"
    | "forbidden"
    | "not_found"
    | "closed"
    | "unchanged"
    | "conflict"
    | "generic",
    string
  >;
};

type Props = {
  intakeId: string;
  /** Seconds with hundredths, or a whole count 0..10. */
  kind: "time" | "count";
  attempts: readonly SavedAttempt[];
  /** "Попытка {attempt}: {value} с" */
  lineTemplate: string;
  texts: CorrectionTexts;
  onCorrected: (id: string, value: number) => void;
  /** Shown next to a result that is waiting for a connection. */
  pendingLabel?: string;
};

const format = (kind: Props["kind"], value: number) =>
  kind === "time" ? value.toFixed(2) : String(value);

/** Saved attempts of one child with a form to correct each of them. */
export function AttemptsPanel({
  intakeId,
  kind,
  attempts,
  lineTemplate,
  texts,
  onCorrected,
  pendingLabel,
}: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);
  const [saving, startSaving] = useTransition();
  // One id per correction: sending it again (a retry) changes nothing.
  const eventId = useRef("");

  function open(attempt: SavedAttempt) {
    eventId.current = crypto.randomUUID();
    setEditing(attempt.id);
    setValue(format(kind, attempt.value));
    setReason("");
    setMessage(null);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const id = editing;
    startSaving(async () => {
      const result = await correctMeasurementAction({
        intakeId,
        measurementId: id,
        value: Number(value),
        reason,
        clientEventId: eventId.current,
        occurredAtDevice: new Date().toISOString(),
      });
      if (result.ok) {
        onCorrected(id, result.value);
        setEditing(null);
        setMessage({
          kind: "ok",
          text: interpolate(texts.done, {
            value: format(kind, result.value),
          }),
        });
      } else {
        setMessage({ kind: "error", text: texts.errors[result.code] });
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-2 text-sm text-ink">
        {attempts.map((a) => (
          <li key={a.id} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>
                {interpolate(lineTemplate, {
                  attempt: a.attempt,
                  value: format(kind, a.value),
                })}
                {a.pending && pendingLabel ? ` · ${pendingLabel}` : ""}
              </span>
              {/* A result that is not on the server yet cannot be corrected. */}
              {editing !== a.id && !a.pending ? (
                <Button
                  variant="ghost"
                  className="min-h-11 px-4 text-sm text-primary"
                  onClick={() => open(a)}
                >
                  {texts.fix}
                  <span className="sr-only">
                    {" "}
                    {interpolate(texts.titleLine, { attempt: a.attempt })}
                  </span>
                </Button>
              ) : null}
            </div>

            {editing === a.id ? (
              <form
                onSubmit={submit}
                aria-label={interpolate(texts.titleLine, {
                  attempt: a.attempt,
                })}
                className="flex flex-col gap-3 rounded-xl border border-line bg-surface-muted p-4"
              >
                <Input
                  label={texts.newValue}
                  type="number"
                  inputMode={kind === "time" ? "decimal" : "numeric"}
                  step={kind === "time" ? 0.01 : 1}
                  min={kind === "time" ? 0.1 : 0}
                  max={kind === "time" ? 300 : 10}
                  required
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                />
                <Input
                  label={texts.reason}
                  hint={texts.reasonHint}
                  required
                  minLength={3}
                  maxLength={300}
                  autoComplete="off"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={saving}>
                    {saving ? texts.saving : texts.submit}
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={saving}
                    onClick={() => setEditing(null)}
                  >
                    {texts.cancel}
                  </Button>
                </div>
              </form>
            ) : null}
          </li>
        ))}
      </ul>
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
    </div>
  );
}
