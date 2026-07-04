"use client";

import { useMemo } from "react";
import { useAccount, useReadContracts } from "wagmi";
import { erc20Abi } from "viem";
import type { Address } from "viem";
import { TOKENS_BY_CHAIN, NATIVE_ADDRESS } from "@/lib/tokens";
import type { Token } from "@/lib/tokens";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LiveTokenBalance {
  address:  Address;
  symbol:   string;
  name:     string;
  decimals: number;
  balance:  bigint;
  usdValue: number;  // always 0 — prices computed in usePortfolio / useTokenPrices
  chainId?: number;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Reads live ERC-20 balances directly on-chain via wagmi multicall.
 * No API keys required — works on all chains configured in wagmi.
 *
 * @param chains       Chain IDs to query (default: [1])
 * @param extraTokens  Additional tokens to query (e.g. custom-added tokens)
 */
export function useBalances(chains?: number[], extraTokens?: Token[]) {
  const { address } = useAccount();

  const targetChains = useMemo(() => chains ?? [1], [chains]);

  // Flat, de-duplicated list of every ERC-20 to query across requested chains
  const tokenList = useMemo<Token[]>(() => {
    const seen   = new Set<string>();
    const result: Token[] = [];

    for (const chainId of targetChains) {
      for (const t of TOKENS_BY_CHAIN[chainId] ?? []) {
        if (t.isNative || t.address === NATIVE_ADDRESS) continue;
        const key = `${chainId}:${t.address.toLowerCase()}`;
        if (!seen.has(key)) { seen.add(key); result.push(t); }
      }
    }

    for (const t of extraTokens ?? []) {
      if (t.isNative || t.address === NATIVE_ADDRESS) continue;
      const key = `${t.chainId}:${t.address.toLowerCase()}`;
      if (!seen.has(key)) { seen.add(key); result.push(t); }
    }

    return result;
  }, [targetChains, extraTokens]);

  // Build wagmi multicall contracts — one balanceOf per token
  const contracts = useMemo(() => {
    if (!address) return [];
    return tokenList.map((token) => ({
      address:      token.address as Address,
      abi:          erc20Abi,
      functionName: "balanceOf" as const,
      args:         [address] as const,
      chainId:      token.chainId,
    }));
  }, [tokenList, address]);

  const { data, isLoading, isFetching, isError } = useReadContracts({
    contracts,
    query: {
      enabled:              !!address && contracts.length > 0,
      staleTime:             30_000,
      gcTime:               300_000,
      refetchInterval:       60_000,
      refetchOnWindowFocus:  false,
    },
  });

  // Map results back to token metadata + balance; filter out zero balances
  const allTokens = useMemo<LiveTokenBalance[]>(() => {
    if (!data) return [];
    return tokenList
      .map((token, i) => {
        const res     = data[i];
        const balance = res?.status === "success" ? (res.result as bigint) : 0n;
        return {
          address:  token.address as Address,
          symbol:   token.symbol,
          name:     token.name,
          decimals: token.decimals,
          balance,
          usdValue: 0,
          chainId:  token.chainId,
        };
      })
      .filter((t) => t.balance > 0n);
  }, [data, tokenList]);

  return {
    portfolios: [],         // kept for API compat
    allTokens,
    totalUsd:   0,          // computed separately in usePortfolio
    isLoading:  !!address && isLoading,
    isFetching: !!address && isFetching,
    isError:    !!address && isError,
    hasApiKeys: true,       // kept for API compat; always true now
  };
}
