"use client";

import { useEffect } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useSetActiveWallet } from "@privy-io/wagmi";

/**
 * Bridges Privy's auth state to wagmi's useAccount() connector.
 *
 * After Google/Apple login Privy creates an embedded MPC wallet, but wagmi
 * doesn't know about it yet.  This hook calls setActiveWallet() which tells
 * wagmi's Privy connector to use that wallet — making useAccount().address
 * (and every hook that depends on it) reflect the user's smart wallet address.
 *
 * Call site: SmartAccountActivator inside Providers (runs on every page).
 *
 * Priority order:
 *   1. Privy embedded wallet (the smart-wallet signer, type "privy")
 *   2. Any other wallet linked to the Privy account (MetaMask, Coinbase, …)
 */
export function useSmartAccount() {
  const { ready, authenticated } = usePrivy();
  const { wallets }              = useWallets();
  const { setActiveWallet }      = useSetActiveWallet();

  useEffect(() => {
    if (!ready || !authenticated || wallets.length === 0) return;

    // Prefer the Privy-embedded wallet (MPC signer for the smart account).
    // Fall back to the first linked wallet (e.g. MetaMask connected externally).
    const embeddedWallet = wallets.find((w: { walletClientType: string }) => w.walletClientType === "privy");
    const target         = embeddedWallet ?? wallets[0];

    if (target) setActiveWallet(target);
  }, [ready, authenticated, wallets, setActiveWallet]);

  return { ready, authenticated };
}
