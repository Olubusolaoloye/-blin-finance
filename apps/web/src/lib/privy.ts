/**
 * Privy configuration — social login + seedless smart wallets.
 *
 * Flow:
 *  1. User taps "Continue with Google / Apple"
 *  2. Privy handles OAuth in a secure popup
 *  3. An embedded MPC wallet is created automatically (key shards stored across
 *     Privy's MPC nodes — user never sees a seed phrase)
 *  4. A ZeroDev Kernel ERC-4337 smart account is derived from that signer
 *  5. `useAccount()` from wagmi returns the smart-account address
 *  6. All existing hooks (useVaultData, useBalances, …) work unchanged
 *
 * Dashboard: https://dashboard.privy.io  →  create an app, enable
 *   Smart Wallets → Kernel (ZeroDev), then copy the App ID below.
 */

import type { PrivyClientConfig } from "@privy-io/react-auth";
import { mainnet, arbitrum, arbitrumSepolia, bsc, bscTestnet } from "wagmi/chains";

export const PRIVY_APP_ID =
  process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "clxxxxxxxxxxxxxxxxxxxxxxx";

export const privyConfig: PrivyClientConfig = {
  // ── Login methods ───────────────────────────────────────────────────────
  loginMethods: ["google", "apple", "email"],
  // "wallet" can be added to allow MetaMask/Coinbase/WalletConnect as well

  // ── Branding ─────────────────────────────────────────────────────────────
  appearance: {
    theme:              "light",
    accentColor:        "#2E86AB",   // brand-accent blue
    showWalletLoginFirst: false,
    walletChainType:    "ethereum-only",
  },

  // ── Embedded wallet (MPC, no seed phrase) ────────────────────────────────
  embeddedWallets: {
    // Automatically create a wallet for every new social login
    createOnLogin:             "users-without-wallets",
    requireUserPasswordOnCreate: false,
    // Sign silently so we don't show Privy's confirmation modal on every tx
    noPromptOnSignature:        true,
  },

  // ── Smart wallet / ERC-4337 ───────────────────────────────────────────────
  // Enable this block after turning on Smart Wallets in the Privy Dashboard
  // (Settings → Smart Wallets → Kernel).  Privy will then expose a
  // ZeroDev Kernel account; useSmartWallets() returns the bundler client.
  //
  // smartWallets: {
  //   type: "kernel",
  // },

  // ── Supported chains ──────────────────────────────────────────────────────
  // Cast needed: wagmi/chains types have `testnet?: boolean` (optional) but
  // Privy's PrivyClientConfig uses exactOptionalPropertyTypes: true so it
  // expects `testnet: boolean` (required).  The runtime values are identical.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  defaultChain:    arbitrumSepolia as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supportedChains: [arbitrumSepolia, bscTestnet, mainnet, bsc, arbitrum] as any[],
};
