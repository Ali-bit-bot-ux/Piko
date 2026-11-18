import { getDictionary } from "@/lib/i18n";
import { ClockIcon, ScaleIcon, ShieldIcon, SproutIcon } from "./icons";

const icons = [ShieldIcon, ClockIcon, ScaleIcon, SproutIcon];

/** Four benefits in one row with dividers, like the reference. */
export function Benefits() {
  const t = getDictionary().landing.benefits;

  return (
    <section aria-labelledby="benefits-title">
      <h2 id="benefits-title" className="sr-only">
        {t.title}
      </h2>
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
          {t.items.map((item, index) => {
            const Icon = icons[index] ?? ScaleIcon;
            return (
              <li
                key={item.title}
                className="flex gap-3 lg:border-l lg:border-line lg:px-6 lg:first:border-l-0 lg:first:pl-0"
              >
                <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
                  <Icon className="size-6" />
                </span>
                <span className="flex flex-col gap-0.5">
                  <h3 className="text-base font-bold text-ink">{item.title}</h3>
                  <p className="text-sm text-ink-muted">{item.text}</p>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
