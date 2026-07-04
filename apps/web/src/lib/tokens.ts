import type { Address } from "viem";
import type { SupportedChainId } from "@blin/shared";

// ─── Token definition ─────────────────────────────────────────────────────────

export interface Token {
  symbol:    string;
  name:      string;
  address:   Address;
  decimals:  number;
  chainId:   number;           // number — supports mainnet + testnet chain IDs
  logoUrl?:  string;
  isNative?: boolean;
  isTestnet?: boolean;         // true for mock / faucet tokens
}

/**
 * Pseudo-address used by ParaSwap / 1inch to represent the chain's native token.
 * Never passed to ERC-20 transfer calls.
 */
export const NATIVE_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" as Address;

// ─── Ethereum Mainnet (chainId: 1) ───────────────────────────────────────────

export const ETHEREUM_TOKENS: Token[] = [
  { symbol: "ETH",  name: "Ethereum",      address: NATIVE_ADDRESS,                                       decimals: 18, chainId: 1,  isNative: true },
  { symbol: "USDT", name: "Tether USD",    address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",         decimals: 6,  chainId: 1 },
  { symbol: "USDC", name: "USD Coin",      address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",         decimals: 6,  chainId: 1 },
  { symbol: "WBTC", name: "Wrapped BTC",   address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",         decimals: 8,  chainId: 1 },
  { symbol: "DAI",  name: "Dai",           address: "0x6B175474E89094C44Da98b954EedeAC495271d0F",         decimals: 18, chainId: 1 },
  { symbol: "WETH", name: "Wrapped ETH",   address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",         decimals: 18, chainId: 1 },
  { symbol: "UNI",  name: "Uniswap",       address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",         decimals: 18, chainId: 1 },
  { symbol: "LINK", name: "Chainlink",     address: "0x514910771AF9Ca656af840dff83E8264EcF986CA",         decimals: 18, chainId: 1 },
  { symbol: "AAVE", name: "Aave",          address: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9",         decimals: 18, chainId: 1 },
  { symbol: "CRV",  name: "Curve DAO",     address: "0xD533a949740bb3306d119CC777fa900bA034cd52",         decimals: 18, chainId: 1 },
];

// ─── BNB Smart Chain (chainId: 56) ───────────────────────────────────────────

export const BSC_TOKENS: Token[] = [
  { symbol: "BNB",  name: "BNB",           address: NATIVE_ADDRESS,                                       decimals: 18, chainId: 56, isNative: true },
  { symbol: "USDT", name: "Tether USD",    address: "0x55d398326f99059fF775485246999027B3197955",         decimals: 18, chainId: 56 },
  { symbol: "USDC", name: "USD Coin",      address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",         decimals: 18, chainId: 56 },
  { symbol: "WBNB", name: "Wrapped BNB",   address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",         decimals: 18, chainId: 56 },
  { symbol: "BUSD", name: "Binance USD",   address: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",         decimals: 18, chainId: 56 },
  { symbol: "ETH",  name: "Ethereum",      address: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8",         decimals: 18, chainId: 56 },
  { symbol: "CAKE", name: "PancakeSwap",   address: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82",         decimals: 18, chainId: 56 },
  { symbol: "XRP",  name: "XRP Token",     address: "0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE",         decimals: 18, chainId: 56 },
];

// ─── Arbitrum One (chainId: 42161) ───────────────────────────────────────────

export const ARBITRUM_TOKENS: Token[] = [
  { symbol: "ETH",    name: "Ethereum",    address: NATIVE_ADDRESS,                                       decimals: 18, chainId: 42161, isNative: true },
  { symbol: "USDT",   name: "Tether USD",  address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",         decimals: 6,  chainId: 42161 },
  { symbol: "USDC",   name: "USD Coin",    address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",         decimals: 6,  chainId: 42161 },
  { symbol: "WBTC",   name: "Wrapped BTC", address: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",         decimals: 8,  chainId: 42161 },
  { symbol: "WETH",   name: "Wrapped ETH", address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",         decimals: 18, chainId: 42161 },
  { symbol: "USDC.e", name: "Bridged USDC",address: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",         decimals: 6,  chainId: 42161 },
];

// ─── Arbitrum Sepolia testnet (chainId: 421614) ──────────────────────────────
// Deployed via DeployArbSepolia.s.sol

export const ARB_SEPOLIA_TOKENS: Token[] = [
  {
    symbol: "ETH",   name: "Ethereum",
    address: NATIVE_ADDRESS,
    decimals: 18, chainId: 421614, isNative: true,
  },
  {
    symbol: "mUSDC", name: "Mock USDC (testnet)",
    address: "0x8B919dA41B4296a796de3722519490CA6B2A788B",
    decimals: 6,  chainId: 421614, isTestnet: true,
  },
];

// ─── BSC Testnet (chainId: 97) ───────────────────────────────────────────────
// Deployed via DeployTestnet.s.sol

export const BSC_TESTNET_TOKENS: Token[] = [
  {
    symbol: "BNB",   name: "BNB (testnet)",
    address: NATIVE_ADDRESS,
    decimals: 18, chainId: 97, isNative: true, isTestnet: true,
  },
  {
    symbol: "mUSDC", name: "Mock USDC (testnet)",
    address: "0xbA64B04909B38EeA5601E719bB71cC11cc26126B",
    decimals: 6,  chainId: 97, isTestnet: true,
  },
];

// ─── Index ────────────────────────────────────────────────────────────────────

export const TOKENS_BY_CHAIN: Record<number, Token[]> = {
  1:      ETHEREUM_TOKENS,
  56:     BSC_TOKENS,
  42161:  ARBITRUM_TOKENS,
  421614: ARB_SEPOLIA_TOKENS,
  97:     BSC_TESTNET_TOKENS,
};

/** Popular tokens shown in the quick-select pill row */
export const POPULAR_SYMBOLS: Record<number, string[]> = {
  1:      ["ETH", "USDT", "USDC", "WBTC"],
  56:     ["BNB", "USDT", "USDC", "CAKE"],
  42161:  ["ETH", "USDT", "USDC", "WBTC"],
  421614: ["ETH", "mUSDC"],
  97:     ["BNB", "mUSDC"],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getTokensByChain(chainId: number): Token[] {
  return TOKENS_BY_CHAIN[chainId] ?? [];
}

export function getTokenBySymbol(symbol: string, chainId: number): Token | undefined {
  return TOKENS_BY_CHAIN[chainId]?.find((t) => t.symbol === symbol);
}

/** Legacy alias — kept for files that already import getToken(chainId, address) */
export function getToken(chainIdOrSymbol: number | string, addressOrChainId: Address | number): Token | undefined {
  if (typeof chainIdOrSymbol === "number" && typeof addressOrChainId === "string") {
    const addr = (addressOrChainId as string).toLowerCase();
    return TOKENS_BY_CHAIN[chainIdOrSymbol]?.find(
      (t) => t.address.toLowerCase() === addr,
    );
  }
  return undefined;
}

export function getTokenByAddress(address: string, chainId: number): Token | undefined {
  const addr = address.toLowerCase();
  return TOKENS_BY_CHAIN[chainId]?.find((t) => t.address.toLowerCase() === addr);
}

/** Default "pay" token for a given chain */
export function defaultFromToken(chainId: number): Token {
  const symbol: Record<number, string> = {
    1: "ETH", 56: "BNB", 42161: "ETH", 421614: "ETH", 97: "BNB",
  };
  return (
    getTokenBySymbol(symbol[chainId] ?? "ETH", chainId) ??
    TOKENS_BY_CHAIN[chainId]?.[0] ??
    ETHEREUM_TOKENS[0]!
  );
}

/** Default "receive" token for a given chain */
export function defaultToToken(chainId: number): Token {
  const symbol: Record<number, string> = {
    1: "USDT", 56: "USDT", 42161: "USDT", 421614: "mUSDC", 97: "mUSDC",
  };
  return (
    getTokenBySymbol(symbol[chainId] ?? "USDT", chainId) ??
    TOKENS_BY_CHAIN[chainId]?.[1] ??
    ETHEREUM_TOKENS[1]!
  );
}

/** All tokens (flat, across chains) — kept for global search */
export const TOKENS: Token[] = [
  ...ETHEREUM_TOKENS,
  ...BSC_TOKENS,
  ...ARBITRUM_TOKENS,
  ...ARB_SEPOLIA_TOKENS,
  ...BSC_TESTNET_TOKENS,
];
