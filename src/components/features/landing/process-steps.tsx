import { Badge, ButtonLink, StepCard } from "@/components/ui";
import { getDictionary } from "@/lib/i18n";
import { routes } from "@/lib/routes";
import { ArrowRightIcon } from "@/components/ui";
import { howItWorksId } from "./hero";
import { stepMockups } from "./step-mockups";

/** Title and a link on the left, the five steps in a row on the right (as in the reference). */
export function ProcessSteps() {
  const t = getDictionary().landing.process;

  return (
    <section
      id={howItWorksId}
      aria-labelledby="process-title"
      className="scroll-mt-20 bg-gradient-to-b from-surface to-surface-muted"
    >
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:px-6 xl:grid-cols-[14rem_1fr] xl:gap-8 lg:py-14">
        <div className="flex flex-col items-start gap-4">
          <Badge variant="accent">{t.badge}</Badge>
          <h2
            id="process-title"
            className="text-3xl font-extrabold leading-tight tracking-tight text-ink"
          >
            {t.title}
          </h2>
          <p className="text-ink-muted">{t.subtitle}</p>
          <ButtonLink href={routes.academies}>
            {t.more}
            <ArrowRightIcon className="size-5" />
          </ButtonLink>
        </div>

        <ol
          aria-label={t.listLabel}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:gap-3"
        >
          {t.steps.map((step, index) => {
            const Mockup = stepMockups[index];
            return (
              <StepCard
                key={step.title}
                number={index + 1}
                title={step.title}
                description={step.description}
                className="relative p-4 lg:[&>p]:sr-only lg:[&_h3]:text-sm sm:last:col-span-2 lg:last:col-span-1 lg:not-last:after:absolute lg:not-last:after:-right-3 lg:not-last:after:top-6 lg:not-last:after:text-ink-muted lg:not-last:after:content-['→']"
              >
                {Mockup ? <Mockup /> : null}
              </StepCard>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
