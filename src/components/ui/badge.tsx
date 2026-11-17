import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type BadgeVariant =
  "neutral" | "success" | "accent" | "warning" | "danger";

const variants: Record<BadgeVariant, string> = {
  neutral: "bg-surface-muted text-ink-muted",
  success: "bg-success/10 text-success",
  accent: "bg-accent text-ink",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
};

type BadgeProps = ComponentProps<"span"> & { variant?: BadgeVariant };

export function Badge({
  variant = "neutral",
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
