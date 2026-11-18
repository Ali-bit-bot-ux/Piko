import { ArrowRightIcon, Badge, ButtonLink } from "@/components/ui";
import { getDictionary } from "@/lib/i18n";
import { routes } from "@/lib/routes";
import { HeroArt } from "./hero-art";

export const howItWorksId = "how-it-works";

export function Hero() {
  const t = getDictionary().landing.hero;

  return (
    <section className="bg-gradient-to-b from-surface-muted to-surface">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pb-10 pt-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:gap-12 lg:pb-12 lg:pt-10">
        <div className="flex flex-col items-start gap-6">
          <Badge variant="accent">{t.badge}</Badge>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-ink sm:text-5xl">
            {t.title}
          </h1>
          <p className="max-w-xl text-lg text-ink-muted">{t.subtitle}</p>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <ButtonLink href={routes.signup} size="lg">
              {t.primaryCta}
              <ArrowRightIcon className="size-5" />
            </ButtonLink>
            <ButtonLink href={`#${howItWorksId}`} variant="secondary" size="lg">
              {t.secondaryCta}
            </ButtonLink>
          </div>
          <p className="flex items-center gap-2 text-sm font-medium text-ink-muted">
            <span aria-hidden className="size-2 rounded-full bg-success" />
            {t.proof}
          </p>
        </div>

        <HeroArt />
      </div>
    </section>
  );
}
