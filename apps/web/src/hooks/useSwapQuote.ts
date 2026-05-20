"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { parseUnits, formatUnits } from "viem";
import { useBlinClient } from "./useBlinClient";
import { getQuote } from "@blin/sdk";
import type { QuoteResult } from "@blin/sdk";
import type { Token } from "@/lib/tokens";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseSwapQuoteParams {
  fromToken:    Token | null;
  toToken:      Token | null;
  fromAmount:   string; // human-readable (e.g. "1.5")
  slippageBps?: number; // basis points — default 50 = 0.5 %
}

export interface SwapQuoteResult {
  quote:       QuoteResult | null;
  toAmount:    string; // human-readable output amount
  toAmountMin: string; // minimum output after slippage
  isLoading:   boolean;
  isFetching:  boolean;
  isError:     boolean;
  provider:    "paraswap" | "1inch" | "pancakeswap" | null;
  priceImpactBps: number;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

const DEBOUNCE_MS = 600;

export function useSwapQuote({
  fromToken,
  toToken,
  fromAmount,
  slippageBps = 50,
}: UseSwapQuoteParams): SwapQuoteResult {
  const client = useBlinClient();

  // Debounce the input so we don't fire a network request on every keystroke
  const [debouncedAmount, setDebouncedAmount] = useState(fromAmount);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedAmount(fromAmount), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [fromAmount]);

  const parsedAmount = debouncedAmount ? parseFloat(debouncedAmount) : 0;

  const enabled =
    !!client &&
    !!fromToken &&
    !!toToken &&
    parsedAmount > 0 &&
    fromToken.address !== toToken.address;

  const { data, isLoading, isFetching, isError } = useQuery<QuoteResult | null>({
    queryKey: [
      "swapQuote",
      client?.chainId,
      fromToken?.address,
      toToken?.address,
      debouncedAmount,
      slippageBps,
    ],
    queryFn: async (): Promise<QuoteResult | null> => {
      if (!client || !fromToken || !toToken || !debouncedAmount) return null;

      const amountIn = parseUnits(debouncedAmount, fromToken.decimals);

      const result = await getQuote(client, {
        chainId:    client.chainId,
        tokenIn:    fromToken.address,
        tokenOut:   toToken.address,
        amountIn,
        slippageBps,
      });

      return result.match<QuoteResult | null>(
        (quote) => quote,
        (_err)  => null,
      );
    },
    enabled,
    staleTime:       15_000, // quote is fresh for 15 s
    gcTime:          60_000,
    refetchInterval: 20_000, // auto-refresh every 20 s
    retry:           1,
    placeholderData: (prev) => prev, // keep previous data visible while refetching
  });

  const quote      = data ?? null;
  const decimals   = toToken?.decimals ?? 18;
  const toAmount   = quote ? formatUnits(quote.amountOut,    decimals) : "";
  const toAmountMin= quote ? formatUnits(quote.amountOutMin, decimals) : "";

  return {
    quote,
    toAmount,
    toAmountMin,
    isLoading:  enabled ? isLoading  : false,
    isFetching: enabled ? isFetching : false,
    isError:    enabled ? isError    : false,
    provider:   quote?.provider ?? null,
    priceImpactBps: quote?.priceImpactBps ?? 0,
  };
}
