"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { parseUnits, formatUnits } from "viem";
import { useChainId } from "wagmi";
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
  quote:          QuoteResult | null;
  toAmount:       string; // human-readable output amount
  toAmountMin:    string; // minimum output after slippage
  isLoading:      boolean;
  isFetching:     boolean;
  isError:        boolean;
  provider:       string | null;
  priceImpactBps: number;
}

interface QuoteApiResponse {
  amountOut:    string;
  amountOutMin: string;
  provider:     string;
  fee?:         number;
  error?:       string;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

const DEBOUNCE_MS = 600;

export function useSwapQuote({
  fromToken,
  toToken,
  fromAmount,
  slippageBps = 50,
}: UseSwapQuoteParams): SwapQuoteResult {
  const chainId = useChainId();

  // Debounce so we don't fire a request on every keystroke.
  const [debouncedAmount, setDebouncedAmount] = useState(fromAmount);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedAmount(fromAmount), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [fromAmount]);

  const parsedAmount = debouncedAmount ? parseFloat(debouncedAmount) : 0;

  const enabled =
    !!chainId &&
    !!fromToken &&
    !!toToken &&
    parsedAmount > 0 &&
    fromToken.address !== toToken.address;

  const { data, isLoading, isFetching, isError } = useQuery<QuoteResult | null>({
    queryKey: [
      "swapQuote",
      chainId,
      fromToken?.address,
      toToken?.address,
      debouncedAmount,
      slippageBps,
    ],
    queryFn: async (): Promise<QuoteResult | null> => {
      if (!fromToken || !toToken || !debouncedAmount) return null;

      const amountIn = parseUnits(debouncedAmount, fromToken.decimals);

      const params = new URLSearchParams({
        chainId:     chainId.toString(),
        tokenIn:     fromToken.address,
        tokenOut:    toToken.address,
        amountIn:    amountIn.toString(),
        slippageBps: slippageBps.toString(),
      });

      const res = await fetch(`/api/quote?${params.toString()}`);
      if (!res.ok) return null;

      const json = (await res.json()) as QuoteApiResponse;
      if (json.error || !json.amountOut) return null;

      return {
        amountOut:      BigInt(json.amountOut),
        amountOutMin:   BigInt(json.amountOutMin),
        route:          [],
        gasEstimate:    0n,
        priceImpactBps: 0,
        provider:       json.provider as QuoteResult["provider"],
      };
    },
    enabled,
    staleTime:       15_000,
    gcTime:          60_000,
    refetchInterval: 20_000,
    retry:           1,
    placeholderData: (prev) => prev,
  });

  const quote       = data ?? null;
  const decimals    = toToken?.decimals ?? 18;
  const toAmount    = quote ? formatUnits(quote.amountOut,    decimals) : "";
  const toAmountMin = quote ? formatUnits(quote.amountOutMin, decimals) : "";

  return {
    quote,
    toAmount,
    toAmountMin,
    isLoading:  enabled ? isLoading  : false,
    isFetching: enabled ? isFetching : false,
    isError:    enabled ? isError    : false,
    provider:   quote?.provider ?? null,
    priceImpactBps: 0,
  };
}
