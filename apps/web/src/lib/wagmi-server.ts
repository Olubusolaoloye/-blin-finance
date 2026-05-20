/**
 * Server-safe wagmi config — used ONLY in layout.tsx for cookieToInitialState.
 *
 * @privy-io/wagmi imports @privy-io/react-auth which calls React.createContext()
 * at module load time. Server Components cannot use createContext, so importing
 * the Privy-enhanced wagmiConfig (lib/wagmi.ts) in layout.tsx crashes with:
 *   "createContext is not a function"
 *
 * This file uses plain wagmi (no Privy) with identical storage settings so
 * cookieToInitialState reads the same cookie key ("wagmi.store") that the
 * client-side WagmiProvider expects.  The initial state is then forwarded
 * to <Providers initialState={...}> which passes it to @privy-io/wagmi's
 * WagmiProvider — hydration works correctly.
 */
import { createConfig, cookieStorage, createStorage } from "wagmi";
import { http } from "viem";
import { bsc, mainnet, arbitrum, arbitrumSepolia } from "./chains";

export const wagmiServerConfig = createConfig({
  chains: [bsc, mainnet, arbitrum, arbitrumSepolia],
  storage: createStorage({ storage: cookieStorage }),
  transports: {
    [bsc.id]:             http(),
    [mainnet.id]:         http(),
    [arbitrum.id]:        http(),
    [arbitrumSepolia.id]: http(),
  },
  ssr: true,
});
