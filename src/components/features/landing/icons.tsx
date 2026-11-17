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

export function CheckIcon(props: IconProps) {
  return (
    <svg {...common} {...props}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

/** Balance scale: fair selection. */
export function ScaleIcon(props: IconProps) {
  return (
    <svg {...common} {...props}>
      <path d="M12 4v16M7 20h10M5 7h14" />
      <path d="M5 7l-3 7a3 3 0 006 0L5 7zM19 7l-3 7a3 3 0 006 0l-3-7z" />
    </svg>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <svg {...common} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

/** Shield with a check: trust. */
export function ShieldIcon(props: IconProps) {
  return (
    <svg {...common} {...props}>
      <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

/** Sprout: growth of players. */
export function SproutIcon(props: IconProps) {
  return (
    <svg {...common} {...props}>
      <path d="M12 21v-9" />
      <path d="M12 12c0-4 2.5-6 7-6 0 4-2.5 6-7 6zM12 15c0-3-2-5-6-5 0 3 2 5 6 5z" />
    </svg>
  );
}

export function BuildingIcon(props: IconProps) {
  return (
    <svg {...common} {...props}>
      <path d="M4 21V9l8-5 8 5v12M2 21h20M9 21v-6h6v6" />
    </svg>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <svg {...common} {...props}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6M16 4.8a3.5 3.5 0 010 6.4M18 14.4c2 .8 3.5 2.6 3.5 5.6" />
    </svg>
  );
}

export function WhistleIcon(props: IconProps) {
  return (
    <svg {...common} {...props}>
      <circle cx="8" cy="15" r="5" />
      <path d="M13 12l8-3v3l-5 3M8 12v3h3" />
    </svg>
  );
}

export function FlagIcon(props: IconProps) {
  return (
    <svg {...common} {...props}>
      <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
    </svg>
  );
}
