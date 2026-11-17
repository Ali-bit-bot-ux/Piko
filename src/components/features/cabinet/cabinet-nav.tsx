"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export type CabinetNavItem = { href: string; label: string };

/** Sections of the cabinet. Marks the current one with aria-current. */
export function CabinetNav({
  label,
  items,
}: {
  label: string;
  items: readonly CabinetNavItem[];
}) {
  const pathname = usePathname();

  return (
    <nav aria-label={label} className="border-b border-line bg-surface">
      <ul className="mx-auto flex w-full max-w-6xl gap-1 overflow-x-auto px-4 sm:px-6">
        {items.map((item) => {
          const current =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center border-b-2 px-3 text-sm font-semibold",
                  "focus-visible:outline-2 focus-visible:outline-primary",
                  current
                    ? "border-primary text-primary"
                    : "border-transparent text-ink-muted hover:text-ink",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
