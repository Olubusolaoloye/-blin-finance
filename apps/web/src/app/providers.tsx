"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PrivyProvider }                    from "@privy-io/react-auth";
import { WagmiProvider }                    from "@privy-io/wagmi";       // NOT from "wagmi"
import { useState, type ReactNode }         from "react";
import type { State as WagmiState }         from "wagmi";
import { wagmiConfig }                      from "@/lib/wagmi";
import { PRIVY_APP_ID, privyConfig }        from "@/lib/privy";
import { NotificationProvider }             from "@/components/notifications/NotificationContext";
import { useSmartAccount }                  from "@/hooks/useSmartAccount";

// ─── Inner bridge: activates Privy's embedded wallet in wagmi ─────────────────
// Must be rendered INSIDE WagmiProvider so useSetActiveWallet works.
function SmartAccountActivator({ children }: { children: ReactNode }) {
  useSmartAccount();
  return <>{children}</>;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProvidersProps {
  children:      ReactNode;
  /**
   * Wagmi cookie state read on the server (layout.tsx → cookieToInitialState).
   * Forwarding it here prevents the "Invalid property descriptor" hydration crash
   * that occurs when WagmiProvider tries to redefine already-initialised state.
   */
  initialState?: WagmiState | undefined;
}

// ─── Provider tree ────────────────────────────────────────────────────────────
//
//  PrivyProvider          — social auth, embedded MPC wallets, ERC-4337 accounts
//    QueryClientProvider  — TanStack Query cache
//      WagmiProvider      — wagmi + Privy connector (@privy-io/wagmi)
//        SmartAccountActivator — syncs Privy wallet → wagmi useAccount()
//          NotificationProvider
//            {children}

export function Providers({ children, initialState }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime:            120_000,   // 2 min — cuts cold-start fetches
            gcTime:               600_000,   // 10 min in memory
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
        <WagmiProvider config={wagmiConfig} initialState={initialState}>
          <SmartAccountActivator>
            <NotificationProvider>
              {children}
            </NotificationProvider>
          </SmartAccountActivator>
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
