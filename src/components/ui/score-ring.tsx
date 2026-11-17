import { cn } from "@/lib/cn";
import { getDictionary, interpolate } from "@/lib/i18n";
import { ringGeometry } from "@/lib/score-ring";

export type ScoreRingSize = "sm" | "md" | "lg";

const sizes: Record<ScoreRingSize, string> = {
  sm: "size-20 text-xl",
  md: "size-28 text-3xl",
  lg: "size-40 text-5xl",
};

const RADIUS = 44;

type ScoreRingProps = {
  value: number;
  /** Top of the scale. Piko scores run 1.00..5.00 (docs/scoring.md). */
  max?: number;
  /** Accessible name, e.g. "Итоговая оценка". */
  label: string;
  size?: ScoreRingSize;
  className?: string;
};

export function ScoreRing({
  value,
  max = 5,
  label,
  size = "md",
  className,
}: ScoreRingProps) {
  const { circumference, dashOffset } = ringGeometry(value, max, RADIUS);
  const t = getDictionary().common;

  return (
    <div
      role="img"
      aria-label={interpolate(t.scoreAria, {
        label,
        value: value.toFixed(2),
        max,
      })}
      className={cn("relative inline-flex shrink-0", sizes[size], className)}
    >
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          strokeWidth="8"
          className="stroke-line"
        />
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="stroke-primary"
        />
      </svg>
      <div
        aria-hidden
        className="absolute inset-0 flex flex-col items-center justify-center leading-none"
      >
        <span className="font-bold tracking-tight">{value.toFixed(2)}</span>
        <span className="mt-1 text-xs text-ink-muted">
          {interpolate(t.scoreOutOf, { max })}
        </span>
      </div>
    </div>
  );
}
