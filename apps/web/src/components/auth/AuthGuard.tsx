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
  const { ready, authenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !authenticated) {
      router.replace("/login");
    }
  }, [ready, authenticated, router]);

  // Only block while Privy is hydrating the saved session (~100-300 ms).
  // wagmi's isConnecting/isReconnecting runs in the background and must NOT
  // stall the UI — the app renders fine while wagmi finishes connecting.
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-base">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-brand-accent/20 border-t-brand-accent animate-spin" />
          <p className="text-[14px] text-text-muted font-medium">Loading…</p>
        </div>
      </div>
    );
  }

  // Not authenticated — about to redirect, render nothing to avoid flash
  if (!authenticated) return null;

  return <>{children}</>;
}
