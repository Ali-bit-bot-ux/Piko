import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type CardVariant = "default" | "muted" | "dark";

const variants: Record<CardVariant, string> = {
  default: "bg-surface text-ink shadow-card border border-line",
  muted: "bg-surface-muted text-ink",
  dark: "bg-dark text-white shadow-card",
};

type CardProps = ComponentProps<"div"> & { variant?: CardVariant };

export function Card({ variant = "default", className, ...props }: CardProps) {
  return (
    <div
      className={cn("rounded-card p-5 sm:p-6", variants[variant], className)}
      {...props}
    />
  );
}
