import { getDictionary } from "@/lib/i18n";

/**
 * Compact trust strip like the reference: who we work with (partners named by
 * the owner, D-043) and real facts about the product instead of invented counts.
 */
export function AudienceStrip() {
  const t = getDictionary().landing.audience;

  return (
    <section
      aria-labelledby="audience-title"
      className="border-y border-line bg-surface-muted"
    >
      <div className="mx-auto grid w-full max-w-6xl items-center gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[13rem_1fr_1.3fr] lg:gap-8">
        <h2
          id="audience-title"
          className="text-sm font-bold leading-snug text-ink"
        >
          {t.title}
        </h2>

        <ul className="flex flex-wrap items-center gap-3 lg:justify-center">
          {t.partners.map((partner) => (
            <li
              key={partner.name}
              className="flex flex-col rounded-xl border border-line bg-surface px-4 py-2 text-center"
            >
              <span className="text-lg font-extrabold leading-tight tracking-tight text-ink">
                {partner.name}
              </span>
              <span className="text-xs text-ink-muted">{partner.place}</span>
            </li>
          ))}
        </ul>

        <ul className="grid gap-4 border-line sm:grid-cols-3 lg:border-l lg:pl-8">
          {t.facts.map((fact) => (
            <li key={fact.value} className="flex items-center gap-3">
              <span className="text-3xl font-extrabold tracking-tight text-ink">
                {fact.value}
              </span>
              <span className="text-xs leading-snug text-ink-muted">
                {fact.label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
