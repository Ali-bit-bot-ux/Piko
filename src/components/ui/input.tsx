import { useId, type ComponentProps } from "react";
import { cn } from "@/lib/cn";

type InputProps = Omit<ComponentProps<"input">, "id"> & {
  label: string;
  hint?: string;
  error?: string;
  id?: string;
};

export function Input({
  label,
  hint,
  error,
  id,
  className,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const describedBy =
    [hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-semibold text-ink">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          "min-h-11 w-full rounded-xl border border-line bg-surface px-4 text-base text-ink",
          "placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-primary",
          "aria-[invalid=true]:border-danger disabled:opacity-50",
          className,
        )}
        {...props}
      />
      {hint && !error ? (
        <p id={hintId} className="text-sm text-ink-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
