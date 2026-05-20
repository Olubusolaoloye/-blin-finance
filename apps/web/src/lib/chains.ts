import { bsc, mainnet, arbitrum, bscTestnet, arbitrumSepolia } from "wagmi/chains";
import { fallback, http } from "viem";
import { isSupportedChainId, isTestnetChainId, type SupportedChainId } from "@blin/shared";

export const SUPPORTED_WAGMI_CHAINS = [bsc, mainnet, arbitrum] as const;

export type SupportedWagmiChain = (typeof SUPPORTED_WAGMI_CHAINS)[number];

export const TESTNET_CHAINS = [arbitrumSepolia, bscTestnet] as const;

export function getTransport(chainId: number) {
  const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;

  const alchemyUrls: Partial<Record<number, string>> = {
    1:      `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`,
    42161:  `https://arb-mainnet.g.alchemy.com/v2/${alchemyKey}`,
    // Arbitrum Sepolia testnet — Alchemy also supports this slug
    421614: `https://arb-sepolia.g.alchemy.com/v2/${alchemyKey}`,
  };

  const alchemyUrl = alchemyUrls[chainId];
  if (alchemyUrl && alchemyKey) {
    return fallback([http(alchemyUrl), http()]);
  }
  return http();
}

export function chainIdToName(chainId: number): string {
  const chain = SUPPORTED_WAGMI_CHAINS.find((c) => c.id === chainId);
  return chain?.name ?? `Chain ${chainId}`;
}

export function isSupportedWagmiChain(chainId: number): chainId is SupportedChainId {
  return isSupportedChainId(chainId);
}

/** True for any chain the app supports — mainnet or testnet. */
export function isKnownChainId(chainId: number): boolean {
  return isSupportedChainId(chainId) || isTestnetChainId(chainId);
}

export { bsc, mainnet, arbitrum, bscTestnet, arbitrumSepolia };
