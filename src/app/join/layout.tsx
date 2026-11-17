import type { Metadata } from "next";
import { Logo } from "@/components/features/site/logo";

// Registration links are shared with parents only: keep them out of search.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function JoinLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex flex-1 flex-col items-center gap-8 bg-surface-muted px-4 py-10">
      <Logo />
      {children}
    </main>
  );
}
