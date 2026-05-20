"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth }   from "@/hooks/useAuth";

/**
 * Route guard for all (app)/ pages.
 *
 * Uses BOTH Privy's session state and wagmi's connection state so we never
 * flash the login screen during the brief window when Privy has re-hydrated
 * the session but SmartAccountActivator hasn't finished setting the wagmi
 * connector yet.
 *
 *  ready=false          → show spinner (Privy is hydrating saved session)
 *  ready, !authenticated → redirect to /login
 *  ready, authenticated  → render children (wagmi may still be connecting, that's OK)
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, isConnecting } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !authenticated) {
      router.replace("/login");
    }
  }, [ready, authenticated, router]);

  // Privy is still restoring the session from localStorage / cookie
  if (!ready || isConnecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-base">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-brand-accent/20 border-t-brand-accent animate-spin" />
          <p className="text-[14px] text-text-muted font-medium">Loading your wallet…</p>
        </div>
      </div>
    );
  }

  // Not authenticated — about to redirect, render nothing to avoid flash
  if (!authenticated) return null;

  return <>{children}</>;
}
