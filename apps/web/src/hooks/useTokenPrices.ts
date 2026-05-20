"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

// ─── Symbol normalization ─────────────────────────────────────────────────────

const NORMALIZE: Record<string, string> = {
  WETH: "ETH",
  WBNB: "BNB",
  WBTC: "BTC",
};

function normalizeSymbol(symbol: string): string {
  return NORMALIZE[symbol.toUpperCase()] ?? symbol.toUpperCase();
}

const API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ?? "";

// ─── API helpers ──────────────────────────────────────────────────────────────

interface AlchemyPriceEntry {
  symbol: string;
  prices: Array<{ currency: string; value: string }>;
}

interface AlchemyPricesResponse {
  data: AlchemyPriceEntry[];
}

async function fetchCurrentPrices(symbols: string[]): Promise<Map<string, number>> {
  if (!API_KEY || symbols.length === 0) return new Map();

  const res = await fetch(
    `https://api.g.alchemy.com/prices/v1/${API_KEY}/tokens/by-symbol`,
    {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ symbols }),
    },
  );

  if (!res.ok) return new Map();

  const json: AlchemyPricesResponse = await res.json();
  const map = new Map<string, number>();
  for (const entry of json.data ?? []) {
    const usd = entry.prices.find((p) => p.currency === "usd");
    if (usd) map.set(entry.symbol.toUpperCase(), parseFloat(usd.value));
  }
  return map;
}

interface AlchemyHistoricalEntry {
  timestamp: number;
  value:     string;
}

interface AlchemyHistoricalResponse {
  data: { symbol: string; currency: string; history: AlchemyHistoricalEntry[] };
}

/**
 * Fetch 24h price change for ONE symbol.
 * Uses a 48h window so we always get ≥2 data points.
 */
async function fetchChange24h(symbol: string): Promise<{ symbol: string; change: number }> {
  if (!API_KEY) return { symbol, change: 0 };

  const now   = Math.floor(Date.now() / 1000);
  const start = now - 48 * 3600;

  const url = new URL(`https://api.g.alchemy.com/prices/v1/${API_KEY}/tokens/historical`);
  url.searchParams.set("symbol",    symbol);
  url.searchParams.set("startTime", String(start));
  url.searchParams.set("endTime",   String(now));
  url.searchParams.set("interval",  "1d");

  try {
    const res = await fetch(url.toString());
    if (!res.ok) return { symbol, change: 0 };

    const json: AlchemyHistoricalResponse = await res.json();
    const history = json.data?.history ?? [];
    if (history.length < 2) return { symbol, change: 0 };

    const first = parseFloat(history[0]!.value);
    const last  = parseFloat(history[history.length - 1]!.value);
    if (first === 0) return { symbol, change: 0 };

    return { symbol, change: ((last - first) / first) * 100 };
  } catch {
    return { symbol, change: 0 };
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface TokenPricesResult {
  getPrice:     (symbol: string) => number;
  getChange24h: (symbol: string) => number;
  isLoading:    boolean;
}

export function useTokenPrices(symbols: string[]): TokenPricesResult {
  // Stable string key — prevents new query when parent passes a new array
  // reference with identical contents (common cause of render cascades).
  const uniqueKey = useMemo(() => {
    return [...new Set(symbols.map(normalizeSymbol))].sort().join(",");
  }, [symbols]);

  const unique = useMemo(
    () => uniqueKey.split(",").filter(Boolean),
    [uniqueKey],
  );

  // ── Current prices — single batched request, refresh every 90 s ──────────
  const { data: priceData, isLoading: priceLoading } = useQuery({
    queryKey: ["tokenPrices", uniqueKey],
    queryFn:  () => fetchCurrentPrices(unique),
    enabled:  unique.length > 0 && !!API_KEY,
    staleTime:            60_000,   // 60 s
    gcTime:              600_000,   // 10 min in memory
    refetchInterval:      90_000,   // background poll every 90 s
    refetchOnWindowFocus: false,
  });

  // ── 24h changes — N parallel requests but only every 5 min ───────────────
  // Splitting from prices means the cheap current-price poll runs fast while
  // the expensive per-symbol historical calls stay rare.
  const { data: changeData, isLoading: changeLoading } = useQuery({
    queryKey: ["tokenChanges24h", uniqueKey],
    queryFn:  async () => {
      const results = await Promise.all(unique.map(fetchChange24h));
      const map = new Map<string, number>();
      for (const { symbol, change } of results) map.set(symbol, change);
      return map;
    },
    enabled:  unique.length > 0 && !!API_KEY,
    staleTime:            300_000,   // 5 min — 24h change barely moves
    gcTime:             3_600_000,   // 1 hr
    refetchInterval:      300_000,   // re-fetch every 5 min
    refetchOnWindowFocus: false,
  });

  // ── Stable getters (memoized) ─────────────────────────────────────────────
  const getPrice = useMemo(
    () => (symbol: string): number =>
      priceData?.get(normalizeSymbol(symbol)) ?? 0,
    [priceData],
  );

  const getChange24h = useMemo(
    () => (symbol: string): number =>
      changeData?.get(normalizeSymbol(symbol)) ?? 0,
    [changeData],
  );

  return { getPrice, getChange24h, isLoading: priceLoading || changeLoading };
}
