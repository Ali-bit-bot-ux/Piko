import Link from "next/link";
import { getDictionary } from "@/lib/i18n";
import { mainNav } from "@/lib/routes";
import { Logo } from "./logo";

export function SiteFooter() {
  const t = getDictionary();

  return (
    <footer className="border-t border-line bg-surface-muted">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 md:flex-row md:justify-between">
        <div className="flex max-w-sm flex-col gap-3">
          <Logo />
          <p className="text-sm text-ink-muted">{t.footer.tagline}</p>
        </div>

        <nav aria-label={t.footer.sections}>
          <h2 className="mb-3 text-sm font-bold text-ink">
            {t.footer.sections}
          </h2>
          <ul className="flex flex-col gap-1">
            {mainNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-flex min-h-11 items-center rounded-md text-sm text-ink-muted hover:text-primary focus-visible:outline-2 focus-visible:outline-primary"
                >
                  {t.nav[item.key]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto w-full max-w-6xl px-4 py-4 text-sm text-ink-muted sm:px-6">
          {t.footer.rights}
        </p>
      </div>
    </footer>
  );
}
