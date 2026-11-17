import type { ComponentProps } from "react";

// Decorative icons: hidden from assistive technology, pair them with text.
type IconProps = Omit<ComponentProps<"svg">, "children">;

const common = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

export function MenuIcon(props: IconProps) {
  return (
    <svg {...common} {...props}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...common} {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <svg {...common} {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
