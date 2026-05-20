"use client";

import { useMemo } from "react";
import { useChainId } from "wagmi";
import { formatUnits } from "viem";
import type { SupportedChainId } from "@blin/shared";
import { NATIVE_ADDRESS } from "@/lib/tokens";
import { useBalances } from "./useBalances";
import { useNativeBalance } from "./useNativeBalance";
import { useTokenPrices } from "./useTokenPrices";

const NATIVE_SYMBOL: Record<number, string> = {
  1:     "ETH",
  56:    "BNB",
  42161: "ETH",
};

const NATIVE_NAME: Record<number, string> = {
  1:     "Ethereum",
  56:    "BNB",
  42161: "Ethereum",
};

const NGN_RATE = 1580;

export interface PortfolioToken {
  symbol:    string;
  name:      string;
  address:   string;
  decimals:  number;
  balance:   bigint;
  usdValue:  number;
  isNative?: boolean;
}

export interface PortfolioResult {
  tokens:       PortfolioToken[];
  totalUsd:     number;
  totalNgn:     number;
  dayChangePct: number;
  dayChangeUsd: number;
  isLoading:    boolean;
  isFetching:   boolean;
}

export function usePortfolio(): PortfolioResult {
  const chainId     = useChainId();
  const targetChain = chainId as SupportedChainId;

  const {
    allTokens,
    isLoading:  balLoading,
    isFetching: balFetching,
  } = useBalances([targetChain]);

  const {
    balance:      nativeBalance,
    balanceEther,
    isLoading:    nativeLoading,
  } = useNativeBalance();

  const nativeSymbol = NATIVE_SYMBOL[chainId] ?? "ETH";

  // ── Stable symbol list ────────────────────────────────────────────────────
  // useMemo prevents a new array reference on every render, which would make
  // useTokenPrices see a new queryKey and re-fire on every render cycle.
  const allSymbols = useMemo(() => {
    const set = new Set<string>([nativeSymbol]);
    for (const t of allTokens) set.add(t.symbol);
    return [...set];
  }, [nativeSymbol, allTokens]);

  const {
    getPrice,
    getChange24h,
    isLoading: priceLoading,
  } = useTokenPrices(allSymbols);

  // ── Derived portfolio data ────────────────────────────────────────────────
  const { tokens, totalUsd, totalNgn, dayChangePct, dayChangeUsd } = useMemo(() => {
    // Native token
    const nativeUsdValue = balanceEther * getPrice(nativeSymbol);
    const nativeToken: PortfolioToken = {
      symbol:   nativeSymbol,
      name:     NATIVE_NAME[chainId] ?? "Native Token",
      address:  NATIVE_ADDRESS,
      decimals: 18,
      balance:  nativeBalance,
      usdValue: nativeUsdValue,
      isNative: true,
    };

    // ERC-20 tokens
    const erc20Tokens: PortfolioToken[] = allTokens.map((t) => {
      const humanBalance = parseFloat(formatUnits(t.balance, t.decimals));
      return {
        symbol:   t.symbol,
        name:     t.name,
        address:  t.address,
        decimals: t.decimals,
        balance:  t.balance,
        usdValue: humanBalance * getPrice(t.symbol),
      };
    });

    // Filter zero-balance + zero-value, sort by USD descending
    const tokens = [nativeToken, ...erc20Tokens]
      .filter((t) => t.balance > 0n || t.usdValue > 0)
      .sort((a, b) => b.usdValue - a.usdValue);

    const totalUsd = tokens.reduce((sum, t) => sum + t.usdValue, 0);
    const totalNgn = totalUsd * NGN_RATE;

    // Weighted 24h change
    let weightedChangePct = 0;
    if (totalUsd > 0) {
      for (const token of tokens) {
        weightedChangePct += (token.usdValue / totalUsd) * getChange24h(token.symbol);
      }
    }
    const dayChangeUsd = totalUsd * (weightedChangePct / 100);

    return {
      tokens,
      totalUsd,
      totalNgn,
      dayChangePct: parseFloat(weightedChangePct.toFixed(2)),
      dayChangeUsd,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTokens, nativeBalance, balanceEther, nativeSymbol, chainId, getPrice, getChange24h]);

  return {
    tokens,
    totalUsd,
    totalNgn,
    dayChangePct,
    dayChangeUsd,
    isLoading:  balLoading || nativeLoading || priceLoading,
    isFetching: balFetching,
  };
}
