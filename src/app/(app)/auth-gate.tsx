import { CabinetNav } from "@/components/features/cabinet/cabinet-nav";
import { Logo } from "@/components/features/site/logo";
import { Button } from "@/components/ui";
import { getDictionary } from "@/lib/i18n";
import { routes } from "@/lib/routes";
import { requireStaff } from "@/server/auth/session";
import { logoutAction } from "./actions";

/**
 * Lets only signed-in staff through. It reads the session, so it must be
 * rendered inside <Suspense> (see layout.tsx).
 */
export async function AuthGate({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  const { dashboard: t, cabinet } = getDictionary();

  return (
    <>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo />
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-ink-muted sm:inline">
              {user.name} · {t.roles[user.role]}
            </span>
            <form action={logoutAction}>
              <Button type="submit" variant="secondary">
                {t.logout}
              </Button>
            </form>
          </div>
        </div>
      </header>
      <CabinetNav
        label={cabinet.navLabel}
        items={[
          {
            href: routes.dashboard,
            label: cabinet.nav.intakes,
            matchPrefixes: ["/intakes"],
          },
        ]}
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </>
  );
}
