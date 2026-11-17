import { SiteFooter } from "@/components/features/site/site-footer";
import { SiteHeader } from "@/components/features/site/site-header";
import { getDictionary } from "@/lib/i18n";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = getDictionary().header;

  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-primary px-4 py-2 font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        {t.skipToContent}
      </a>
      <SiteHeader />
      <main id="main" className="flex flex-1 flex-col">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
