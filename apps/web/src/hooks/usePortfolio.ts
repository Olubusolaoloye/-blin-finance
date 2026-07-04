"use client";

import { useMemo } from "react";
import { useAccount, useBalance } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { formatUnits } from "viem";
import { NATIVE_ADDRESS } from "@/lib/tokens";
import { useBalances } from "./useBalances";
import { useTokenPrices } from "./useTokenPrices";

// Always show ETH (1) + BNB (56) regardless of which chain the wallet is
// currently connected to — same address works on both EVM chains.
const PORTFOLIO_CHAINS = [1, 56] as const;

const NATIVE_SYMBOL: Record<number, string> = { 1: "ETH", 56: "BNB", 42161: "ETH" };
const NATIVE_NAME:   Record<number, string> = { 1: "Ethereum", 56: "BNB", 42161: "Ethereum" };

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
  const { address } = useAccount();

  // ── Live NGN/USD rate from /api/rate (mid-rate) ───────────────────────────
  const { data: rateData } = useQuery({
    queryKey: ["ngnRate"],
    queryFn:  async () => {
      const res = await fetch("/api/rate");
      return res.json() as Promise<{ buyRate: number; sellRate: number; midRate: number }>;
    },
    staleTime:   300_000,
    gcTime:    1_800_000,
    retry: 1,
  });
  const ngnRate = rateData?.midRate ?? 1_580;

  // ── ERC-20 balances across ETH + BNB ─────────────────────────────────────
  const {
    allTokens,
    isLoading:  balLoading,
    isFetching: balFetching,
  } = useBalances([...PORTFOLIO_CHAINS]);

  // ── Native balances — one hook call per chain (wagmi v2 supports chainId) ─
  const { data: ethBal, isLoading: ethLoading } = useBalance({ address, chainId: 1  });
  const { data: bnbBal, isLoading: bnbLoading } = useBalance({ address, chainId: 56 });

  // ── Stable symbol list for price queries ──────────────────────────────────
  const allSymbols = useMemo(() => {
    const set = new Set<string>(["ETH", "BNB"]);
    for (const t of allTokens) set.add(t.symbol);
    return [...set];
  }, [allTokens]);

  const {
    getPrice,
    getChange24h,
    isLoading: priceLoading,
  } = useTokenPrices(allSymbols);

  // ── Compose portfolio ─────────────────────────────────────────────────────
  const result = useMemo(() => {
    const nativeTokens: PortfolioToken[] = [];

    const ethAmt = parseFloat(ethBal?.formatted ?? "0");
    if (ethAmt > 0) {
      nativeTokens.push({
        symbol:   "ETH",
        name:     NATIVE_NAME[1],
        address:  NATIVE_ADDRESS,
        decimals: 18,
        balance:  ethBal?.value ?? 0n,
        usdValue: ethAmt * getPrice("ETH"),
        chainId:  1,
        isNative: true,
      });
    }

    const bnbAmt = parseFloat(bnbBal?.formatted ?? "0");
    if (bnbAmt > 0) {
      nativeTokens.push({
        symbol:   "BNB",
        name:     NATIVE_NAME[56],
        address:  NATIVE_ADDRESS,
        decimals: 18,
        balance:  bnbBal?.value ?? 0n,
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
      .filter((t) => t.balance > 0n || t.usdValue > 0)
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
  }, [allTokens, ethBal, bnbBal, ngnRate, getPrice, getChange24h]);

  return {
    ...result,
    isLoading:  balLoading || ethLoading || bnbLoading || priceLoading,
    isFetching: balFetching,
  };
}
