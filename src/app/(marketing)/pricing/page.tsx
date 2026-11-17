import type { Metadata } from "next";
import { PageIntro } from "@/components/features/landing/page-sections";
import { ArrowRightIcon, ButtonLink, Card } from "@/components/ui";
import { getDictionary } from "@/lib/i18n";
import { routes } from "@/lib/routes";

const t = getDictionary().landing.pages.pricing;

export const metadata: Metadata = {
  title: `${t.title} | Piko`,
  description: t.description,
};

// Prices are intentionally not published yet (D-021).
export default function PricingPage() {
  return (
    <>
      <PageIntro title={t.title} lead={t.lead} />
      <section aria-label={t.planListLabel}>
        <div className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 lg:pb-20">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {t.plans.map((plan) => (
              <li key={plan.name} className="flex">
                <Card className="flex flex-1 flex-col gap-3">
                  <h2 className="text-xl font-bold text-ink">{plan.name}</h2>
                  <p className="flex-1 text-ink-muted">{plan.audience}</p>
                  <p className="text-lg font-semibold text-primary">
                    {t.priceStub}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
          <div className="mt-10 flex flex-col items-start gap-4">
            <p className="max-w-xl text-ink-muted">{t.contactNote}</p>
            <ButtonLink href={routes.signup} size="lg">
              {t.cta}
              <ArrowRightIcon className="size-5" />
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
