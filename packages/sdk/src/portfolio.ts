import { ResultAsync, errAsync } from "neverthrow";
import { z } from "zod";
import { BlinErrors, type BlinError } from "@blin/shared";
import type { Address } from "viem";
import type {
  PortfolioBalances,
  HistoryPoint,
  HistoryRange,
  AssetAllocation,
  TokenBalance,
} from "./types";
import type { BlinClient } from "./client";

const addressSchema = z.string().regex(/^0x[0-9a-fA-F]{40}$/) as z.ZodType<Address>;

// ─── Chain IDs → Alchemy network slugs ───────────────────────────────────────

const ALCHEMY_NETWORK: Record<number, string> = {
  1:      "eth-mainnet",
  56:     "bnb-mainnet",
  42161:  "arb-mainnet",
  421614: "arb-sepolia",   // Arbitrum Sepolia testnet
  97:     "bnb-testnet",   // BSC Testnet
};

const MORALIS_CHAIN: Record<number, string> = {
  1:      "0x1",
  56:     "0x38",
  42161:  "0xa4b1",
  421614: "0x66eee",       // Arbitrum Sepolia chain hex
  97:     "0x61",          // BSC Testnet chain hex
};

const HISTORY_DAYS: Record<HistoryRange, number> = {
  "1D":  1,
  "1W":  7,
  "1M":  30,
  "3M":  90,
  "1Y":  365,
  "ALL": 99999,
};

const ALLOCATION_COLORS = [
  "#FFD700", "#4A90E2", "#00C896", "#F59E0B",
  "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4",
];

// ─── Alchemy: getTokenBalances ────────────────────────────────────────────────

interface AlchemyTokenBalance {
  contractAddress: string;
  tokenBalance:    string | null;
  error?:          string;
}

interface AlchemyBalancesResponse {
  result: {
    address:       string;
    tokenBalances: AlchemyTokenBalance[];
  };
}

interface AlchemyTokenMetadata {
  name:     string | null;
  symbol:   string | null;
  decimals: number | null;
  logo:     string | null;
}

async function fetchAlchemyBalances(
  address: Address,
  chainId: number,
  apiKey: string,
): Promise<PortfolioBalances | null> {
  const network = ALCHEMY_NETWORK[chainId];
  if (!network) return null;   // unsupported chain — return null gracefully
  const baseUrl = `https://${network}.g.alchemy.com/v2/${apiKey}`;

  // 1. Fetch raw ERC-20 balances
  const balRes = await fetch(baseUrl, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id:      1,
      method:  "alchemy_getTokenBalances",
      params:  [address, "erc20"],
    }),
  });
  if (!balRes.ok) return null;

  const balData = (await balRes.json()) as AlchemyBalancesResponse;
  const rawBalances = balData.result?.tokenBalances ?? [];

  // Filter zero balances
  const nonZero = rawBalances.filter(
    (b) => b.tokenBalance && b.tokenBalance !== "0x0000000000000000000000000000000000000000000000000000000000000000",
  );

  // 2. Fetch metadata for each token in parallel (max 25 per call)
  const metaResults = await Promise.allSettled(
    nonZero.map((b) =>
      fetch(baseUrl, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id:      1,
          method:  "alchemy_getTokenMetadata",
          params:  [b.contractAddress],
        }),
      })
        .then((r) => r.json() as Promise<{ result: AlchemyTokenMetadata }>)
        .then((r) => r.result),
    ),
  );

  const tokens: TokenBalance[] = nonZero.flatMap((bal, i) => {
    const meta = metaResults[i];
    if (meta?.status !== "fulfilled") return [];
    const m = meta.value;
    if (!m.symbol || !m.decimals) return [];

    const rawBal  = BigInt(bal.tokenBalance ?? "0");
    const divisor = 10n ** BigInt(m.decimals);
    const balance = rawBal;

    return [{
      address:  bal.contractAddress as Address,
      symbol:   m.symbol,
      name:     m.name ?? m.symbol,
      decimals: m.decimals,
      balance,
      // USD pricing deferred — Alchemy doesn't provide prices in this endpoint
      usdValue: 0,
      ...(m.logo ? { logoUrl: m.logo } : {}),
    }];
    void divisor;
  });

  return { totalUsd: 0, tokens, chainId };
}

// ─── Moralis: getWalletTokenBalances ─────────────────────────────────────────

interface MoralisToken {
  token_address: string;
  symbol:        string;
  name:          string;
  decimals:      number;
  balance:       string;
  usd_price:     number | null;
  usd_value:     number | null;
  logo?:         string;
}

async function fetchMoralisBalances(
  address: Address,
  chainId: number,
  apiKey: string,
): Promise<PortfolioBalances | null> {
  const chain = MORALIS_CHAIN[chainId];
  if (!chain) return null;   // unsupported chain
  const res = await fetch(
    `https://deep-index.moralis.io/api/v2.2/${address}/erc20?chain=${chain}`,
    { headers: { "X-API-Key": apiKey } },
  );
  if (!res.ok) return null;

  const data = (await res.json()) as MoralisToken[];

  const tokens: TokenBalance[] = data
    .filter((t) => t.balance !== "0")
    .map((t) => {
      const balance  = BigInt(t.balance);
      const usdValue = t.usd_value ?? 0;
      return {
        address:  t.token_address as Address,
        symbol:   t.symbol,
        name:     t.name,
        decimals: t.decimals,
        balance,
        usdValue,
        ...(t.logo ? { logoUrl: t.logo } : {}),
      };
    });

  const totalUsd = tokens.reduce((s, t) => s + t.usdValue, 0);
  return { totalUsd, tokens, chainId };
}

// ─── Moralis: getWalletHistory ────────────────────────────────────────────────

interface MoralisHistoryItem {
  block_timestamp: string;
  summary:         string;
  account_details?: {
    portfolio_value: number | null;
  };
}

async function fetchMoralisHistory(
  address: Address,
  chainId: number,
  fromDate: Date,
  apiKey: string,
): Promise<HistoryPoint[] | null> {
  const chain = MORALIS_CHAIN[chainId];
  const from  = fromDate.toISOString();

  const res = await fetch(
    `https://deep-index.moralis.io/api/v2.2/wallets/${address}/history?chain=${chain}&from_date=${from}`,
    { headers: { "X-API-Key": apiKey } },
  );
  if (!res.ok) return null;

  const data = (await res.json()) as { result: MoralisHistoryItem[] };
  const items = data.result ?? [];

  return items
    .filter((item) => item.account_details?.portfolio_value != null)
    .map((item) => ({
      timestamp: Math.floor(new Date(item.block_timestamp).getTime() / 1000),
      totalUsd:  item.account_details!.portfolio_value!,
    }))
    .sort((a, b) => a.timestamp - b.timestamp);
}

// ─── Public: getBalances ──────────────────────────────────────────────────────

export function getBalances(
  client: BlinClient,
  address: Address,
  chains: number[],
): ResultAsync<PortfolioBalances[], BlinError> {
  const parsed = addressSchema.safeParse(address);
  if (!parsed.success) {
    return errAsync(BlinErrors.validation("address", address));
  }

  return ResultAsync.fromPromise(
    Promise.all(
      chains.map(async (chainId): Promise<PortfolioBalances> => {
        // Alchemy first, Moralis as fallback
        if (client.alchemyApiKey) {
          const result = await fetchAlchemyBalances(
            parsed.data,
            chainId,
            client.alchemyApiKey,
          ).catch(() => null);
          if (result) return result;
        }

        if (client.moralisApiKey) {
          const result = await fetchMoralisBalances(
            parsed.data,
            chainId,
            client.moralisApiKey,
          ).catch(() => null);
          if (result) return result;
        }

        return { totalUsd: 0, tokens: [], chainId };
      }),
    ),
    (err) => BlinErrors.rpc("Failed to fetch balances", undefined, err),
  );
}

// ─── Public: getHistory ───────────────────────────────────────────────────────

export function getHistory(
  client: BlinClient,
  address: Address,
  range: HistoryRange,
): ResultAsync<HistoryPoint[], BlinError> {
  const parsed = addressSchema.safeParse(address);
  if (!parsed.success) {
    return errAsync(BlinErrors.validation("address", address));
  }

  const days     = HISTORY_DAYS[range];
  const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  return ResultAsync.fromPromise(
    (async () => {
      if (client.moralisApiKey) {
        const history = await fetchMoralisHistory(
          parsed.data,
          client.chainId,
          fromDate,
          client.moralisApiKey,
        ).catch(() => null);
        if (history && history.length > 0) return history;
      }

      return [] as HistoryPoint[];
    })(),
    (err) => BlinErrors.rpc("Failed to fetch history", undefined, err),
  );
}

// ─── Public: getAssetAllocation ───────────────────────────────────────────────

export function getAssetAllocation(
  client: BlinClient,
  address: Address,
  chains: number[],
): ResultAsync<AssetAllocation[], BlinError> {
  return getBalances(client, address, chains).map((balancesPerChain) => {
    const allTokens = balancesPerChain.flatMap((b) => b.tokens);
    const total     = allTokens.reduce((sum, t) => sum + t.usdValue, 0);

    return allTokens.map((t, i) => ({
      symbol:     t.symbol,
      address:    t.address,
      usdValue:   t.usdValue,
      percentage: total > 0 ? (t.usdValue / total) * 100 : 0,
      color:      ALLOCATION_COLORS[i % ALLOCATION_COLORS.length] ?? "#4A90E2",
    }));
  });
}
