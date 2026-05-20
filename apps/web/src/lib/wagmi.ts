/**
 * Wagmi config — built on @privy-io/wagmi so the Privy connector
 * (embedded wallet + smart wallet) is automatically injected.
 *
 * IMPORTANT: import WagmiProvider from "@privy-io/wagmi" (not "wagmi") and
 * place it INSIDE <PrivyProvider>.  The createConfig here is a thin wrapper
 * around wagmi's createConfig that adds Privy's connector automatically.
 *
 * This file is also imported by layout.tsx (a Server Component) for
 * cookieToInitialState — @privy-io/wagmi re-exports that helper so there is
 * no barrel-optimization issue with RainbowKit.
 */
import { createConfig }                from "@privy-io/wagmi";
import { cookieStorage, createStorage } from "wagmi";
import { bsc, mainnet, arbitrum, arbitrumSepolia } from "./chains";
import { getTransport } from "./chains";

export const wagmiConfig = createConfig({
  chains: [bsc, mainnet, arbitrum, arbitrumSepolia],

  // cookieStorage → server reads wallet state from request cookie
  // (via cookieToInitialState in layout.tsx) — prevents the
  // "Invalid property descriptor" hydration crash on first load.
  storage: createStorage({ storage: cookieStorage }),

  transports: {
    [bsc.id]:             getTransport(bsc.id),
    [mainnet.id]:         getTransport(mainnet.id),
    [arbitrum.id]:        getTransport(arbitrum.id),
    [arbitrumSepolia.id]: getTransport(arbitrumSepolia.id),
  },

  ssr: true,
});
