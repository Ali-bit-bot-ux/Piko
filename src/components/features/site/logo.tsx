import Image from "next/image";
import Link from "next/link";
import { getDictionary } from "@/lib/i18n";
import { routes } from "@/lib/routes";

/** The Piko mark (a football inside the letter P, from the owner) and the name. */
export function Logo() {
  const t = getDictionary().header;
  return (
    <Link
      href={routes.home}
      aria-label={t.homeAria}
      className="inline-flex min-h-11 items-center gap-2.5 rounded-lg text-2xl font-extrabold tracking-tight text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <Image
        src="/images/logo.webp"
        alt=""
        width={40}
        height={40}
        priority
        className="size-10 rounded-xl"
      />
      <span aria-hidden>Piko</span>
    </Link>
  );
}
