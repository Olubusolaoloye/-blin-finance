import { AppProviders } from "./providers";
import { AppShell }    from "@/components/layout/AppShell";
import { AuthGuard }   from "@/components/auth/AuthGuard";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProviders>
      <AuthGuard>
        <AppShell>{children}</AppShell>
      </AuthGuard>
    </AppProviders>
  );
}
