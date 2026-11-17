import { getDictionary } from "@/lib/i18n";
import { BuildingIcon, FlagIcon, UsersIcon, WhistleIcon } from "./icons";

const icons = [BuildingIcon, UsersIcon, WhistleIcon, FlagIcon];

/** "Who is it for" strip. Text placeholders only: no logos or counts (D-013). */
export function AudienceStrip() {
  const t = getDictionary().landing.audience;

  return (
    <section
      aria-labelledby="audience-title"
      className="border-y border-line bg-surface"
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <h2
          id="audience-title"
          className="text-center text-sm font-bold uppercase tracking-wide text-ink-muted"
        >
          {t.title}
        </h2>
        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {t.items.map((item, index) => {
            const Icon = icons[index] ?? BuildingIcon;
            return (
              <li
                key={item.title}
                className="flex items-center gap-3 rounded-card bg-surface-muted p-4"
              >
                <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-surface text-primary">
                  <Icon className="size-6" />
                </span>
                <span className="flex flex-col">
                  <span className="font-semibold text-ink">{item.title}</span>
                  <span className="text-sm text-ink-muted">{item.text}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
