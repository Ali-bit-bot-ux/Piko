import { useId, type ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type SelectOption = { value: string; label: string };

type SelectProps = Omit<ComponentProps<"select">, "id" | "children"> & {
  label: string;
  options: readonly SelectOption[];
  id?: string;
};

export function Select({
  label,
  options,
  id,
  className,
  ...props
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={selectId} className="text-sm font-semibold text-ink">
        {label}
      </label>
      <select
        id={selectId}
        className={cn(
          "min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-base text-ink",
          "focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
