"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PrivyProvider }                    from "@privy-io/react-auth";
import { WagmiProvider }                    from "@privy-io/wagmi";       // NOT from "wagmi"
import { useState, useEffect, useRef, type ReactNode } from "react";
import { useAccount }                       from "wagmi";
import { wagmiConfig }                      from "@/lib/wagmi";
import { PRIVY_APP_ID, privyConfig }        from "@/lib/privy";
import { NotificationProvider }             from "@/components/notifications/NotificationContext";
import { useSmartAccount }                  from "@/hooks/useSmartAccount";
import { useUserStore }                     from "@/store/userStore";
import { useQueryClient }                   from "@tanstack/react-query";

// ─── Inner bridge: activates Privy's embedded wallet in wagmi ─────────────────
// Must be rendered INSIDE WagmiProvider so useSetActiveWallet works.
function SmartAccountActivator({ children }: { children: ReactNode }) {
  useSmartAccount();
  return <>{children}</>;
}

// ─── Wallet change watcher ────────────────────────────────────────────────────
// Resets user profile store and query cache whenever the connected wallet
// address changes — prevents a different account's name/email from leaking
// into the new session's UI.
function WalletChangeHandler() {
  const { address } = useAccount();
  const reset       = useUserStore((s) => s.reset);
  const qc          = useQueryClient();
  const prevAddress = useRef<string | undefined>(undefined);

  useEffect(() => {
    // Skip the very first render (undefined → address on mount)
    if (prevAddress.current === undefined) {
      prevAddress.current = address;
      return;
    }
    // Only act when address actually changes to a different non-null value
    if (address && address !== prevAddress.current) {
      reset();                          // clear stored displayName / email
      qc.clear();                       // bust all cached vault/balance queries
      prevAddress.current = address;
    }
    // Address went to undefined (disconnect) — just track it
    if (!address) {
      prevAddress.current = undefined;
    }
  }, [address, reset, qc]);

  return null;
}

// ─── Provider tree ────────────────────────────────────────────────────────────
//
//  PrivyProvider          — social auth, embedded MPC wallets, ERC-4337 accounts
//    QueryClientProvider  — TanStack Query cache
//      WagmiProvider      — wagmi + Privy connector (@privy-io/wagmi)
//        SmartAccountActivator — syncs Privy wallet → wagmi useAccount()
//          NotificationProvider
//            {children}
//
// Note: initialState / cookieToInitialState intentionally removed.
// wagmiConfig uses localStorage (not cookieStorage) so no SSR cookie state
// is needed. Privy re-connects the embedded wallet on mount automatically.

export function Providers({ children }: { children: ReactNode }) {
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
        <WagmiProvider config={wagmiConfig}>
          <SmartAccountActivator>
            <WalletChangeHandler />
            <NotificationProvider>
              {children}
            </NotificationProvider>
          </SmartAccountActivator>
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
