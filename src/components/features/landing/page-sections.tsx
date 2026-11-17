import type { ReactNode } from "react";
import { Card } from "@/components/ui";

/** Top of an inner marketing page: the only h1 and a short lead. */
export function PageIntro({
  title,
  lead,
  children,
}: {
  title: string;
  lead: string;
  children?: ReactNode;
}) {
  return (
    <section className="bg-gradient-to-b from-surface-muted to-surface">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-5 px-4 pb-12 pt-10 sm:px-6 lg:pb-16 lg:pt-16">
        <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight text-ink sm:text-5xl">
          {title}
        </h1>
        <p className="max-w-2xl text-lg text-ink-muted">{lead}</p>
        {children}
      </div>
    </section>
  );
}

type FeatureItem = { title: string; text: string };

/** A titled grid of short cards (h2 + h3 per card). */
export function FeatureSection({
  id,
  title,
  items,
}: {
  id: string;
  title: string;
  items: readonly FeatureItem[];
}) {
  return (
    <section aria-labelledby={id}>
      <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
        <h2
          id={id}
          className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl"
        >
          {title}
        </h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <li key={item.title} className="flex">
              <Card className="flex flex-1 flex-col gap-2">
                <h3 className="text-lg font-bold text-ink">{item.title}</h3>
                <p className="text-ink-muted">{item.text}</p>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
