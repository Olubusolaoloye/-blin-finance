"use client";

import { useMemo } from "react";
import { useAccount, useBalance } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { useQuery } from "@tanstack/react-query";
import { formatUnits } from "viem";
import { NATIVE_ADDRESS } from "@/lib/tokens";
import { useBalances } from "./useBalances";
import { useCustomTokens } from "./useCustomTokens";

// Always show ETH (1) + BNB (56) regardless of which chain the wallet is connected to.
const PORTFOLIO_CHAINS = [1, 56] as const;

const NATIVE_NAME: Record<number, string> = { 1: "Ethereum", 56: "BNB Chain" };

// CoinGecko IDs for the tokens we price — no API key required.
const CG_IDS: Record<string, string> = {
  ETH:  "ethereum",
  WETH: "ethereum",
  BNB:  "binancecoin",
  WBNB: "binancecoin",
  BTC:  "bitcoin",
  WBTC: "bitcoin",
  USDC: "usd-coin",
  USDT: "tether",
  DAI:  "dai",
  MATIC: "matic-network",
  ARB:  "arbitrum",
};

// Reasonable fallback prices in case CoinGecko is down.
const FALLBACK_PRICES: Record<string, number> = {
  ETH:  3_500, WETH: 3_500,
  BNB:    650, WBNB:   650,
  BTC:  95_000, WBTC: 95_000,
  USDC:   1,  USDT:    1,  DAI: 1,
};

export interface PortfolioToken {
  symbol:    string;
  name:      string;
  address:   string;
  decimals:  number;
  balance:   bigint;
  usdValue:  number;
  chainId?:  number;
  isNative?: boolean;
}

export interface PortfolioResult {
  tokens:       PortfolioToken[];
  totalUsd:     number;
  totalNgn:     number;
  ngnRate:      number;
  dayChangePct: number;
  dayChangeUsd: number;
  dayChangeNgn: number;
  isLoading:    boolean;
  isFetching:   boolean;
}

export function usePortfolio(): PortfolioResult {
  // Use both wagmi address and Privy address — whichever is available first.
  const { address: wagmiAddress } = useAccount();
  const { user } = usePrivy();
  const privyAddress = user?.wallet?.address as `0x${string}` | undefined;
  const address = wagmiAddress ?? privyAddress;

  // ── Live NGN/USD rate ─────────────────────────────────────────────────────
  const { data: rateData } = useQuery({
    queryKey: ["ngnRate"],
    queryFn:  async () => {
      const res = await fetch("/api/rate");
      if (!res.ok) throw new Error("rate fetch failed");
      return res.json() as Promise<{ buyRate: number; sellRate: number; midRate: number }>;
    },
    staleTime: 300_000,
    gcTime:  1_800_000,
    retry: 1,
  });
  const ngnRate = rateData?.midRate ?? 1_580;

  // ── CoinGecko token prices (free, no API key) ─────────────────────────────
  const cgIds = Object.values(CG_IDS).join(",");
  const { data: cgPrices } = useQuery({
    queryKey: ["cgPrices", cgIds],
    queryFn:  async () => {
      const res = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${cgIds}&vs_currencies=usd&include_24hr_change=true`,
        { next: { revalidate: 60 } } as RequestInit,
      );
      if (!res.ok) return null;
      return res.json() as Promise<Record<string, { usd: number; usd_24h_change?: number }>>;
    },
    staleTime:            60_000,
    gcTime:              600_000,
    refetchInterval:      90_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  function getPrice(symbol: string): number {
    const cgId = CG_IDS[symbol.toUpperCase()];
    const entry = cgId ? cgPrices?.[cgId] : undefined;
    if (entry?.usd) return entry.usd;
    return FALLBACK_PRICES[symbol.toUpperCase()] ?? 0;
  }

  function getChange24h(symbol: string): number {
    const cgId = CG_IDS[symbol.toUpperCase()];
    const entry = cgId ? cgPrices?.[cgId] : undefined;
    if (entry?.usd_24h_change != null) return entry.usd_24h_change;
    return 0;
  }

  // Custom tokens the user has added per chain (persisted in localStorage)
  const { customTokens: customEth } = useCustomTokens(1);
  const { customTokens: customBsc } = useCustomTokens(56);
  const extraTokens = useMemo(
    () => [...customEth, ...customBsc],
    [customEth, customBsc],
  );

  // ── ERC-20 balances across ETH + BNB ─────────────────────────────────────
  const {
    allTokens,
    isLoading:  balLoading,
    isFetching: balFetching,
  } = useBalances([...PORTFOLIO_CHAINS], extraTokens);

  // ── Native balances ───────────────────────────────────────────────────────
  const { data: ethBal, isLoading: ethLoading } = useBalance({ address, chainId: 1  });
  const { data: bnbBal, isLoading: bnbLoading } = useBalance({ address, chainId: 56 });

  // ── Compose portfolio ─────────────────────────────────────────────────────
  const result = useMemo(() => {
    const nativeTokens: PortfolioToken[] = [];

    const ethAmt = parseFloat(ethBal?.formatted ?? "0");
    if (ethAmt > 0) {
      nativeTokens.push({
        symbol:   "ETH",
        name:     NATIVE_NAME[1] ?? "Ethereum",
        address:  NATIVE_ADDRESS,
        decimals: 18,
        balance:  ethBal!.value,
        usdValue: ethAmt * getPrice("ETH"),
        chainId:  1,
        isNative: true,
      });
    }

    const bnbAmt = parseFloat(bnbBal?.formatted ?? "0");
    if (bnbAmt > 0) {
      nativeTokens.push({
        symbol:   "BNB",
        name:     NATIVE_NAME[56] ?? "BNB Chain",
        address:  NATIVE_ADDRESS,
        decimals: 18,
        balance:  bnbBal!.value,
        usdValue: bnbAmt * getPrice("BNB"),
        chainId:  56,
        isNative: true,
      });
    }

    const erc20Tokens: PortfolioToken[] = allTokens.map((t) => ({
      symbol:   t.symbol,
      name:     t.name,
      address:  t.address,
      decimals: t.decimals,
      balance:  t.balance,
      usdValue: parseFloat(formatUnits(t.balance, t.decimals)) * getPrice(t.symbol),
    }));

    const tokens = [...nativeTokens, ...erc20Tokens]
      .filter((t) => t.balance > 0n)
      .sort((a, b) => b.usdValue - a.usdValue);

    const totalUsd = tokens.reduce((s, t) => s + t.usdValue, 0);
    const totalNgn = totalUsd * ngnRate;

    let weightedChangePct = 0;
    if (totalUsd > 0) {
      for (const t of tokens) {
        weightedChangePct += (t.usdValue / totalUsd) * getChange24h(t.symbol);
      }
    }
    const dayChangePct = parseFloat(weightedChangePct.toFixed(2));
    const dayChangeUsd = totalUsd * (weightedChangePct / 100);
    const dayChangeNgn = dayChangeUsd * ngnRate;

    return { tokens, totalUsd, totalNgn, ngnRate, dayChangePct, dayChangeUsd, dayChangeNgn };
  }, [allTokens, ethBal, bnbBal, ngnRate, cgPrices]);  // eslint-disable-line react-hooks/exhaustive-deps

  return {
    ...result,
    isLoading:  balLoading || ethLoading || bnbLoading,
    isFetching: balFetching,
  };
}
