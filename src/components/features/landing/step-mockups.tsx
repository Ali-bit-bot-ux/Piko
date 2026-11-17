import type { ReactNode } from "react";
import { Badge, ScoreRing } from "@/components/ui";
import { getDictionary } from "@/lib/i18n";
import { CheckIcon } from "./icons";

/**
 * Mini screens for the five steps. Decorative (aria-hidden): the step text
 * next to them says the same. All values are examples.
 */
function Frame({ children }: { children: ReactNode }) {
  const example = getDictionary().landing.process.mockupExample;
  return (
    <div
      aria-hidden
      className="relative flex min-h-36 flex-col justify-center gap-2 rounded-2xl bg-surface-muted p-4"
    >
      <span className="absolute right-3 top-3 text-[0.7rem] font-semibold uppercase tracking-wide text-ink-muted">
        {example}
      </span>
      {children}
    </div>
  );
}

// 7x7 decorative pattern, deliberately not a scannable code.
const qrCells = [
  "1110101",
  "1010010",
  "1110110",
  "0001001",
  "1101011",
  "0110100",
  "1011101",
];

function CreateIntakeMockup() {
  const m = getDictionary().landing.process.mockups.create;
  return (
    <Frame>
      <div className="flex flex-col gap-1 pt-3">
        <span className="text-xs text-ink-muted">{m.nameLabel}</span>
        <span className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold">
          {m.nameValue}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-ink-muted">{m.groupLabel}</span>
        <span className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold">
          {m.groupValue}
        </span>
      </div>
    </Frame>
  );
}

function RegistrationMockup() {
  const m = getDictionary().landing.process.mockups.registration;
  return (
    <Frame>
      <div className="flex items-center gap-3 pt-3">
        <svg
          viewBox="0 0 7 7"
          className="size-16 shrink-0 rounded-md bg-surface p-1"
        >
          {qrCells.flatMap((row, y) =>
            [...row].map((cell, x) =>
              cell === "1" ? (
                <rect
                  key={`${x}-${y}`}
                  x={x}
                  y={y}
                  width="1"
                  height="1"
                  className="fill-ink"
                />
              ) : null,
            ),
          )}
        </svg>
        <span className="flex flex-col text-xs">
          <span className="font-semibold text-ink">{m.qrLabel}</span>
          <span className="text-ink-muted">{m.hint}</span>
        </span>
      </div>
    </Frame>
  );
}

function TrialMockup() {
  const m = getDictionary().landing.process.mockups.trial;
  return (
    <div
      aria-hidden
      className="relative flex min-h-36 flex-col items-center justify-center gap-1 rounded-2xl bg-dark p-4 text-white"
    >
      <span className="text-xs text-white/70">{m.testName}</span>
      <span className="text-4xl font-bold tabular-nums">
        {m.time}
        <span className="ml-1 text-base font-medium text-white/70">
          {m.unit}
        </span>
      </span>
      <span className="mt-1 inline-flex size-9 items-center justify-center rounded-full bg-accent text-ink">
        <CheckIcon className="size-5" />
      </span>
    </div>
  );
}

function ResultMockup() {
  const m = getDictionary().landing.process.mockups.result;
  return (
    <Frame>
      <div className="flex items-center gap-3 pt-3">
        <ScoreRing value={4.2} size="sm" label={m.ringLabel} />
        <Badge variant="success">{m.status}</Badge>
      </div>
    </Frame>
  );
}

function ReportMockup() {
  const m = getDictionary().landing.process.mockups.report;
  return (
    <Frame>
      <span className="pt-3 text-sm font-semibold text-ink">{m.title}</span>
      <span className="flex items-center gap-2 text-xs text-ink">
        <CheckIcon className="size-4 shrink-0 text-success" />
        {m.strength}
      </span>
      <span className="h-2 w-4/5 rounded-full bg-primary/30" />
      <span className="mt-1 text-xs text-ink">{m.growth}</span>
      <span className="h-2 w-3/5 rounded-full bg-accent" />
    </Frame>
  );
}

export const stepMockups = [
  CreateIntakeMockup,
  RegistrationMockup,
  TrialMockup,
  ResultMockup,
  ReportMockup,
];
