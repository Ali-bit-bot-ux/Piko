import { Logo } from "@/components/features/site/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 bg-surface-muted px-4 py-10">
      <Logo />
      {children}
    </main>
  );
}
