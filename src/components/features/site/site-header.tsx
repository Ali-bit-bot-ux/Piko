import Link from "next/link";
import { ArrowRightIcon, ButtonLink } from "@/components/ui";
import { getDictionary } from "@/lib/i18n";
import { mainNav, routes } from "@/lib/routes";
import { Logo } from "./logo";
import { MobileMenu } from "./mobile-menu";

export function SiteHeader() {
  const t = getDictionary();
  const items = mainNav.map((item) => ({
    href: item.href,
    label: t.nav[item.key],
  }));

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur">
      <div className="relative mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <Logo />

        <nav aria-label={t.header.mainNav} className="hidden lg:block">
          <ul className="flex items-center gap-8">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="rounded-md py-2 text-sm font-semibold text-ink hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <ButtonLink href={routes.login} variant="secondary">
            {t.auth.login}
          </ButtonLink>
          <ButtonLink href={routes.signup} variant="accent">
            {t.auth.start}
            <ArrowRightIcon className="size-5" />
          </ButtonLink>
        </div>

        <MobileMenu
          navLabel={t.header.mainNav}
          openLabel={t.header.openMenu}
          closeLabel={t.header.closeMenu}
          items={items}
          login={{ href: routes.login, label: t.auth.login }}
          start={{ href: routes.signup, label: t.auth.start }}
        />
      </div>
    </header>
  );
}
