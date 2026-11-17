import { Card } from "@/components/ui";
import { getDictionary } from "@/lib/i18n";
import { ClockIcon, ScaleIcon, ShieldIcon, SproutIcon } from "./icons";

const icons = [ScaleIcon, ClockIcon, ShieldIcon, SproutIcon];

export function Benefits() {
  const t = getDictionary().landing.benefits;

  return (
    <section aria-labelledby="benefits-title">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <h2
          id="benefits-title"
          className="max-w-2xl text-3xl font-extrabold tracking-tight text-ink sm:text-4xl"
        >
          {t.title}
        </h2>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {t.items.map((item, index) => {
            const Icon = icons[index] ?? ScaleIcon;
            return (
              <li key={item.title} className="flex">
                <Card className="flex flex-1 flex-col gap-3">
                  <span className="inline-flex size-12 items-center justify-center rounded-full bg-accent text-ink">
                    <Icon className="size-6" />
                  </span>
                  <h3 className="text-lg font-bold text-ink">{item.title}</h3>
                  <p className="text-ink-muted">{item.text}</p>
                </Card>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
