"use client";

import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { useBlinClient } from "./useBlinClient";
import { getBalances } from "@blin/sdk";
import type { PortfolioBalances } from "@blin/sdk";

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Fetches live ERC-20 + native token balances via the SDK (Alchemy → Moralis).
 * Supports mainnet and testnet chains.
 */
export function useBalances(chains?: number[]) {
  const { address } = useAccount();
  const client       = useBlinClient();

  const hasApiKeys = !!(
    process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ||
    process.env.NEXT_PUBLIC_MORALIS_API_KEY
  );

  const targetChains: number[] = chains ??
    (client?.chainId ? [client.chainId] : [1]);

  // Only run when we actually have API keys — otherwise saves an unnecessary round-trip
  const enabled = !!address && !!client && hasApiKeys;

  const { data, isLoading, isFetching, isError } = useQuery<PortfolioBalances[]>({
    queryKey: ["balances", address, targetChains.join(",")],
    queryFn: async () => {
      if (!client || !address) return [];

      const result = await getBalances(client, address as `0x${string}`, targetChains);

      return result.match<PortfolioBalances[]>(
        (balances) => balances,
        (_err)    => [],
      );
    },
    enabled,
    staleTime:            120_000,  // 2 min — balances don't change every second
    gcTime:              600_000,   // 10 min in memory
    refetchOnWindowFocus: false,    // prevent spam on tab switch
    refetchInterval:     180_000,   // background refresh every 3 min
    retry:               1,
  });

  /** All token balances flattened from every fetched chain */
  const allTokens = (data ?? []).flatMap((b) => b.tokens);

  /** Total USD across all chains (0 when no API keys) */
  const totalUsd = (data ?? []).reduce((sum, b) => sum + b.totalUsd, 0);

  return {
    portfolios: data ?? [],
    allTokens,
    totalUsd,
    isLoading:  enabled ? isLoading  : false,
    isFetching: enabled ? isFetching : false,
    isError:    enabled ? isError    : false,
    hasApiKeys,
  };
}
