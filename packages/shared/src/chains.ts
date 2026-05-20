export const SUPPORTED_CHAIN_IDS = [56, 1, 42161] as const;
export type SupportedChainId = (typeof SUPPORTED_CHAIN_IDS)[number];

/** Testnet chains used during Phase D development. Not shown in prod UI. */
export const TESTNET_CHAIN_IDS = [421614, 97] as const;
export type TestnetChainId = (typeof TESTNET_CHAIN_IDS)[number];

/** Union of all chains the app may encounter. */
export type AnyChainId = SupportedChainId | TestnetChainId;

export const CHAIN_NAMES: Record<AnyChainId, string> = {
  56:     "BNB Smart Chain",
  1:      "Ethereum",
  42161:  "Arbitrum One",
  421614: "Arbitrum Sepolia",
  97:     "BSC Testnet",
};

export const CHAIN_NATIVE_TOKENS: Record<AnyChainId, string> = {
  56:     "BNB",
  1:      "ETH",
  42161:  "ETH",
  421614: "ETH",
  97:     "BNB",
};

export const BLOCK_EXPLORERS: Record<AnyChainId, string> = {
  56:     "https://bscscan.com",
  1:      "https://etherscan.io",
  42161:  "https://arbiscan.io",
  421614: "https://sepolia.arbiscan.io",
  97:     "https://testnet.bscscan.com",
};

export function isSupportedChainId(id: number): id is SupportedChainId {
  return (SUPPORTED_CHAIN_IDS as readonly number[]).includes(id);
}

export function isTestnetChainId(id: number): id is TestnetChainId {
  return (TESTNET_CHAIN_IDS as readonly number[]).includes(id);
}

export function isAnyChainId(id: number): id is AnyChainId {
  return isSupportedChainId(id) || isTestnetChainId(id);
}
