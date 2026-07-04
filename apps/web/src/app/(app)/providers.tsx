"use client";

// ─── App-level providers — wagmi stack only ────────────────────────────────────
//
// Loaded ONLY for (app)/ routes. Keeps wagmi + viem + MetaMask SDK out of
// the landing page and login screen. PrivyProvider is already at root.

import { useEffect, useRef, type ReactNode } from "react";
import { WagmiProvider }                     from "@privy-io/wagmi";
import { useAccount }                        from "wagmi";
import { wagmiConfig }                       from "@/lib/wagmi";
import { useSmartAccount }                   from "@/hooks/useSmartAccount";
import { useUserStore }                      from "@/store/userStore";
import { useQueryClient }                    from "@tanstack/react-query";

// Syncs Privy's embedded wallet into wagmi so useAccount() resolves.
function SmartAccountActivator({ children }: { children: ReactNode }) {
  useSmartAccount();
  return <>{children}</>;
}

// Clears user store + query cache on wallet address change.
function WalletChangeHandler() {
  const { address } = useAccount();
  const reset       = useUserStore((s) => s.reset);
  const qc          = useQueryClient();
  const prev        = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (prev.current === undefined) { prev.current = address; return; }
    if (address && address !== prev.current) { reset(); qc.clear(); }
    prev.current = address ?? undefined;
  }, [address, reset, qc]);

  return null;
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <SmartAccountActivator>
        <WalletChangeHandler />
        {children}
      </SmartAccountActivator>
    </WagmiProvider>
  );
}
