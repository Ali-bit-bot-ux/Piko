import { StepCard } from "@/components/ui";
import { getDictionary } from "@/lib/i18n";
import { howItWorksId } from "./hero";
import { stepMockups } from "./step-mockups";

export function ProcessSteps() {
  const t = getDictionary().landing.process;

  return (
    <section
      id={howItWorksId}
      aria-labelledby="process-title"
      className="scroll-mt-20 bg-surface-muted"
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <h2
          id="process-title"
          className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl"
        >
          {t.title}
        </h2>
        <p className="mt-3 max-w-2xl text-lg text-ink-muted">{t.subtitle}</p>
        <ol
          aria-label={t.listLabel}
          className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
        >
          {t.steps.map((step, index) => {
            const Mockup = stepMockups[index];
            return (
              <StepCard
                key={step.title}
                number={index + 1}
                title={step.title}
                description={step.description}
                className="sm:last:col-span-2 lg:last:col-span-1"
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
