"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import {
  ArrowRightIcon,
  ButtonLink,
  CloseIcon,
  MenuIcon,
} from "@/components/ui";

export type MobileMenuProps = {
  navLabel: string;
  openLabel: string;
  closeLabel: string;
  items: readonly { href: string; label: string }[];
  login: { href: string; label: string };
  start: { href: string; label: string };
};

/** Burger menu for screens narrower than lg. Texts come from the server component. */
export function MobileMenu({
  navLabel,
  openLabel,
  closeLabel,
  items,
  login,
  start,
}: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="lg:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? closeLabel : openLabel}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex size-11 items-center justify-center rounded-full text-ink hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {open ? <CloseIcon /> : <MenuIcon />}
      </button>

      {open ? (
        <div
          id={panelId}
          className="absolute inset-x-0 top-full border-b border-line bg-surface px-4 pb-6 pt-2 shadow-card"
        >
          <nav aria-label={navLabel}>
            <ul className="flex flex-col">
              {items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={close}
                    className="flex min-h-12 items-center rounded-lg px-2 text-lg font-medium text-ink hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="mt-4 flex flex-col gap-3">
            <ButtonLink
              href={login.href}
              variant="secondary"
              onClick={close}
              className="w-full"
            >
              {login.label}
            </ButtonLink>
            <ButtonLink
              href={start.href}
              variant="accent"
              onClick={close}
              className="w-full"
            >
              {start.label}
              <ArrowRightIcon className="size-5" />
            </ButtonLink>
          </div>
        </div>
      ) : null}
    </div>
  );
}
