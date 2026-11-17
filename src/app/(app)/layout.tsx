import { Suspense } from "react";
import { getDictionary } from "@/lib/i18n";
import { AuthGate } from "./auth-gate";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const t = getDictionary().dashboard;

  return (
    <Suspense fallback={<p className="p-6 text-ink-muted">{t.loading}</p>}>
      <AuthGate>{children}</AuthGate>
    </Suspense>
  );
}
