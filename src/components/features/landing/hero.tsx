import { ArrowRightIcon, Badge, ButtonLink } from "@/components/ui";
import { getDictionary } from "@/lib/i18n";
import { routes } from "@/lib/routes";
import { HeroArt } from "./hero-art";

export const howItWorksId = "how-it-works";

export function Hero() {
  const t = getDictionary().landing.hero;

  return (
    <section className="bg-gradient-to-b from-surface-muted to-surface">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:pb-24 lg:pt-16">
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
        </div>

        <HeroArt />
      </div>
    </section>
  );
}
