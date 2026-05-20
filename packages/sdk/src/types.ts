import type { Address, Hash, PublicClient, WalletClient } from "viem";

// ─── Client ───────────────────────────────────────────────────────────────────

export interface BlinClientConfig {
  /** Numeric chain ID — supports mainnet and testnet chains. */
  chainId: number;
  publicClient: PublicClient;
  walletClient?: WalletClient;
  /** Alchemy API key — required for getBalances / getHistory */
  alchemyApiKey?: string;
  /** Moralis API key — fallback when Alchemy is unavailable */
  moralisApiKey?: string;
}

// ─── Swap ─────────────────────────────────────────────────────────────────────

export interface QuoteRequest {
  chainId: number;
  tokenIn: Address;
  tokenOut: Address;
  amountIn: bigint;
  slippageBps: number;
}

export interface QuoteResult {
  amountOut: bigint;
  amountOutMin: bigint;
  route: RouteStep[];
  gasEstimate: bigint;
  priceImpactBps: number;
  provider: "paraswap" | "1inch" | "pancakeswap";
}

export interface RouteStep {
  tokenIn: Address;
  tokenOut: Address;
  protocol: string;
  poolAddress: Address;
  portion: number;
}

export interface SwapWithSaveRequest {
  quote: QuoteResult;
  saveBps: number;
  vaultAddress?: Address;
  deadline: bigint;
  tokenIn: Address;
  tokenOut: Address;
  amountIn: bigint;
}

export interface SwapWithSaveResult {
  txHash: Hash;
  savedAmount: bigint;
  receivedAmount: bigint;
  vaultAddress: Address;
}

// ─── Vault ────────────────────────────────────────────────────────────────────

export interface VaultLock {
  id: bigint;
  amount: bigint;
  lockedUntil: bigint;
  createdAt: bigint;
  name: string;
  broken: boolean;
  // Derived fields
  daysRemaining: number;
  maturityDate: Date;
  currentYield: bigint;
  currentValue: bigint;
}

export interface CreateLockRequest {
  vaultAddress: Address;
  amount: bigint;
  lockDurationSeconds: bigint;
  name: string;
}

export interface TopUpRequest {
  vaultAddress: Address;
  lockId: bigint;
  amount: bigint;
}

export interface WithdrawRequest {
  vaultAddress: Address;
  lockId: bigint;
}

export interface BreakLockRequest {
  vaultAddress: Address;
  lockId: bigint;
}

export interface ContractInteraction<TArgs> {
  request: TArgs;
  simulate: () => Promise<bigint>;
  write: () => Promise<Hash>;
}

// ─── Portfolio ────────────────────────────────────────────────────────────────

export interface TokenBalance {
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  balance: bigint;
  usdValue: number;
  logoUrl?: string;
}

export interface PortfolioBalances {
  totalUsd: number;
  tokens: TokenBalance[];
  chainId: number;
}

export interface HistoryPoint {
  timestamp: number;
  totalUsd: number;
}

export type HistoryRange = "1D" | "1W" | "1M" | "3M" | "1Y" | "ALL";

export interface AssetAllocation {
  symbol: string;
  address: Address;
  usdValue: number;
  percentage: number;
  color: string;
}
