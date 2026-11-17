import Link from "next/link";
import { getDictionary } from "@/lib/i18n";
import { routes } from "@/lib/routes";

/** Placeholder wordmark: a simple "P" tile and the name. Replace with the real logo later. */
export function Logo() {
  const t = getDictionary().header;
  return (
    <Link
      href={routes.home}
      aria-label={t.homeAria}
      className="inline-flex items-center gap-2 rounded-lg text-2xl font-extrabold tracking-tight text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <span
        aria-hidden
        className="inline-flex size-9 items-center justify-center rounded-xl bg-primary text-xl font-black text-white"
      >
        P
      </span>
      <span aria-hidden>Piko</span>
    </Link>
  );
}
