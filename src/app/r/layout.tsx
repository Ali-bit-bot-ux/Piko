import type { Metadata } from "next";
import { Logo } from "@/components/features/site/logo";

// Report links are private: keep them out of search and do not pass the
// address (it holds the token) on to other sites as a referrer.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

// Print: paper margins and exact colors for the score ring.
const printCss =
  "@media print { @page { margin: 14mm; } body { background: #fff !important; } * { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }";

export default function ReportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex flex-1 flex-col items-center gap-8 bg-surface-muted px-4 py-10 print:bg-white print:py-0">
      <style>{printCss}</style>
      <Logo />
      {children}
    </main>
  );
}
