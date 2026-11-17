import { ArrowRightIcon, ButtonLink } from "@/components/ui";
import { getDictionary } from "@/lib/i18n";
import { routes } from "@/lib/routes";

export function CtaBanner() {
  const t = getDictionary().landing.cta;

  return (
    <section aria-labelledby="cta-title">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="flex flex-col items-start gap-6 rounded-3xl bg-dark p-8 text-white sm:p-12">
          <h2
            id="cta-title"
            className="max-w-2xl text-3xl font-extrabold tracking-tight sm:text-4xl"
          >
            {t.title}
          </h2>
          <p className="max-w-xl text-lg text-white/80">{t.text}</p>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <ButtonLink href={routes.signup} variant="accent" size="lg">
              {t.primary}
              <ArrowRightIcon className="size-5" />
            </ButtonLink>
            <ButtonLink
              href={routes.pricing}
              variant="secondary"
              size="lg"
              className="border-white/30 bg-transparent text-white hover:bg-white/10"
            >
              {t.secondary}
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
