import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type StepCardProps = Omit<ComponentProps<"li">, "title"> & {
  number: number;
  title: string;
  description?: string;
};

/** One step of the "how it works" list. Render inside an <ol>. */
export function StepCard({
  number,
  title,
  description,
  children,
  className,
  ...props
}: StepCardProps) {
  return (
    <li
      className={cn(
        "flex flex-col gap-3 rounded-card border border-line bg-surface p-5 shadow-card",
        className,
      )}
      {...props}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span
          aria-hidden
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white"
        >
          {number}
        </span>
        <h3 className="min-w-0 text-base font-semibold text-ink [overflow-wrap:anywhere]">
          {title}
        </h3>
      </div>
      {description ? (
        <p className="text-sm text-ink-muted">{description}</p>
      ) : null}
      {children}
    </li>
  );
}
