"use client";

// ─── Root providers ────────────────────────────────────────────────────────────
//
// What lives here (loaded on EVERY page — landing, login, app):
//   PrivyProvider       — needed on /login AND (app)/ pages; must be at root
//   QueryClientProvider — shared cache (lightweight)
//   NotificationProvider — toast system (lightweight)
//
// What does NOT live here:
//   WagmiProvider, SmartAccountActivator, WalletChangeHandler
//   → in app/(app)/providers.tsx — loaded only for authenticated app routes.
//   This keeps wagmi + viem + MetaMask SDK out of the landing page bundle.

import { useState, type ReactNode }         from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PrivyProvider }                    from "@privy-io/react-auth";
import { NotificationProvider }             from "@/components/notifications/NotificationContext";
import { PRIVY_APP_ID, privyConfig }        from "@/lib/privy";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime:            120_000,
            gcTime:               600_000,
            retry:                1,
            refetchOnWindowFocus: false,
            refetchOnReconnect:   true,
          },
        },
      }),
  );

  return (
    <PrivyProvider appId={PRIVY_APP_ID} config={privyConfig}>
      <QueryClientProvider client={queryClient}>
        <NotificationProvider>
          {children}
        </NotificationProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
