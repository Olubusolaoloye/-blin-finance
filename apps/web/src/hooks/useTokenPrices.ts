"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

// ─── CoinGecko ID map ─────────────────────────────────────────────────────────

const CG_IDS: Record<string, string> = {
  ETH:   "ethereum",
  WETH:  "ethereum",
  BNB:   "binancecoin",
  WBNB:  "binancecoin",
  BTC:   "bitcoin",
  WBTC:  "bitcoin",
  USDC:  "usd-coin",
  USDT:  "tether",
  DAI:   "dai",
  MATIC: "matic-network",
  POL:   "matic-network",
  ARB:   "arbitrum",
  LINK:  "chainlink",
  UNI:   "uniswap",
  CAKE:  "pancakeswap-token",
};

// Reasonable fallbacks when CoinGecko is unreachable.
const FALLBACK_PRICES: Record<string, number> = {
  ETH:  3_500, WETH: 3_500,
  BNB:    650, WBNB:   650,
  BTC:  95_000, WBTC: 95_000,
  USDC:   1,   USDT:    1, DAI: 1,
  ARB:    1.2,
  LINK:  18,
  UNI:   10,
  CAKE:   3,
};

function normalizeSymbol(symbol: string): string {
  return symbol.toUpperCase();
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface TokenPricesResult {
  getPrice:     (symbol: string) => number;
  getChange24h: (symbol: string) => number;
  isLoading:    boolean;
}

export function useTokenPrices(symbols: string[]): TokenPricesResult {
  // Stable query key — prevents refetch when parent passes a new array reference
  // with identical contents.
  const uniqueKey = useMemo(() => {
    const unique = [...new Set(symbols.map(normalizeSymbol))].sort();
    return unique.join(",");
  }, [symbols]);

  const cgIds = useMemo(() => {
    const ids = new Set<string>();
    for (const sym of uniqueKey.split(",").filter(Boolean)) {
      const id = CG_IDS[sym];
      if (id) ids.add(id);
    }
    return [...ids].join(",");
  }, [uniqueKey]);

  // ── Current prices + 24h change — one batched CoinGecko request ──────────
  const { data: cgPrices, isLoading } = useQuery({
    queryKey: ["cgTokenPrices", cgIds],
    queryFn: async () => {
      if (!cgIds) return null;
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${cgIds}&vs_currencies=usd&include_24hr_change=true`,
      );
      if (!res.ok) return null;
      return res.json() as Promise<Record<string, { usd: number; usd_24h_change?: number }>>;
    },
    enabled:              !!cgIds,
    staleTime:            60_000,
    gcTime:              600_000,
    refetchInterval:      90_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // ── Stable getter functions ───────────────────────────────────────────────
  const getPrice = useMemo(
    () => (symbol: string): number => {
      const sym  = normalizeSymbol(symbol);
      const cgId = CG_IDS[sym];
      const entry = cgId ? cgPrices?.[cgId] : undefined;
      if (entry?.usd) return entry.usd;
      return FALLBACK_PRICES[sym] ?? 0;
    },
    [cgPrices],
  );

  const getChange24h = useMemo(
    () => (symbol: string): number => {
      const sym  = normalizeSymbol(symbol);
      const cgId = CG_IDS[sym];
      const entry = cgId ? cgPrices?.[cgId] : undefined;
      if (entry?.usd_24h_change != null) return entry.usd_24h_change;
      return 0;
    },
    [cgPrices],
  );

  return { getPrice, getChange24h, isLoading };
}
