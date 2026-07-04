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
  /** DEX that provided the quote. */
  provider: "uniswap-v3" | "pancakeswap-v2" | "mock" | string;
  /** Uniswap V3 fee tier used for this quote (100 / 500 / 3000 / 10000). */
  fee?: number;
}

export interface RouteStep {
  tokenIn: Address;
  tokenOut: Address;
  protocol: string;
  poolAddress: Address;
  portion: number;
}

export interface SwapWithSaveRequest {
  quote:        QuoteResult;
  saveBps:      number;
  deadline:     bigint;
  tokenIn:      Address;
  tokenOut:     Address;
  amountIn:     bigint;
  /**
   * Lock duration in seconds [7 days, 3 years].
   * Defaults to 30 days (2_592_000) if omitted.
   */
  lockDuration?: bigint;
  /**
   * PancakeSwap V2 path for the main swap.
   * For BNB input path[0] must be WBNB; for BNB output path[last] must be WBNB.
   * If omitted a direct [tokenIn, tokenOut] path is used.
   */
  pathMain?: Address[];
  /**
   * PancakeSwap V2 path for the save-portion → USDC conversion.
   * Leave empty (or omit) when tokenOut is already USDC.
   */
  pathSave?: Address[];
  /** Minimum USDC from the save→USDC leg. Defaults to 0 (no slippage check). */
  minSaveUsdc?: bigint;
}

export interface SwapWithSaveResult {
  txHash:      Hash;
  lockId:      bigint;
  vaultAddress: Address;
}

// ─── Vault ────────────────────────────────────────────────────────────────────

export interface VaultLock {
  id:          bigint;
  owner:       Address;
  /** USDC wei locked. */
  principal:   bigint;
  lockedAt:    bigint;
  lockedUntil: bigint;
  /** $BLIN wei earned on matured withdrawal (display only — claimed on Ethereum). */
  blinReward:  bigint;
  name:        string;
  settled:     boolean;
  // Derived fields
  daysRemaining: number;
  maturityDate:  Date;
  /** Alias for principal — the lock's current USDC value. */
  currentValue:  bigint;
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
