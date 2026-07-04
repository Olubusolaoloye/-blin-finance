/**
 * Wagmi config — built on @privy-io/wagmi so the Privy connector
 * (embedded wallet + smart wallet) is automatically injected.
 *
 * IMPORTANT: import WagmiProvider from "@privy-io/wagmi" (not "wagmi") and
 * place it INSIDE <PrivyProvider>.
 *
 * Storage: localStorage (client-only, safe no-op on server).
 * We intentionally do NOT use cookieStorage + ssr:true because both require
 * the exact same config UID on server and client — impossible when
 * wagmiServerConfig (plain wagmi) and wagmiConfig (@privy-io/wagmi) are
 * separate instances with different auto-generated UIDs. That mismatch is
 * what causes the "Invalid property descriptor" Object.defineProperty crash.
 * Privy re-connects the embedded wallet on mount automatically, so no SSR
 * wallet state is needed.
 */
import { createConfig } from "@privy-io/wagmi";
import { createStorage } from "wagmi";
import { bsc, mainnet, arbitrum, arbitrumSepolia, bscTestnet } from "./chains";
import { getTransport } from "./chains";

// Safe localStorage wrapper — no-ops on the server so Next.js SSR doesn't crash.
const safeLocalStorage = {
  getItem:    (key: string) => (typeof window !== "undefined" ? window.localStorage.getItem(key)    : null),
  setItem:    (key: string, value: string) => { if (typeof window !== "undefined") window.localStorage.setItem(key, value); },
  removeItem: (key: string) => { if (typeof window !== "undefined") window.localStorage.removeItem(key); },
};

export const wagmiConfig = createConfig({
  chains: [bsc, mainnet, arbitrum, arbitrumSepolia, bscTestnet],
  storage: createStorage({ storage: safeLocalStorage }),
  transports: {
    [bsc.id]:             getTransport(bsc.id),
    [mainnet.id]:         getTransport(mainnet.id),
    [arbitrum.id]:        getTransport(arbitrum.id),
    [arbitrumSepolia.id]: getTransport(arbitrumSepolia.id),
    [bscTestnet.id]:      getTransport(bscTestnet.id),  // public RPC from wagmi/chains
  },
  // ssr: false (default) — avoids the Object.defineProperty crash from
  // mismatched server/client config UIDs with cookieStorage.
});
