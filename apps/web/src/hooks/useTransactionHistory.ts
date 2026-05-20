"use client";

import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { useBlinClient } from "./useBlinClient";
import { getHistory } from "@blin/sdk";
import type { HistoryPoint, HistoryRange } from "@blin/sdk";

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Fetches wallet portfolio history via Moralis.
 * Returns an empty array (no error) when no Moralis API key is configured.
 */
export function useTransactionHistory(range: HistoryRange = "1M") {
  const { address } = useAccount();
  const client       = useBlinClient();

  const hasMoralis = !!process.env.NEXT_PUBLIC_MORALIS_API_KEY;

  // History requires Moralis specifically (Alchemy doesn't support portfolio timeline)
  const enabled = !!address && !!client && hasMoralis;

  const { data, isLoading, isFetching, isError } = useQuery<HistoryPoint[]>({
    queryKey: ["txHistory", address, client?.chainId, range],
    queryFn: async () => {
      if (!client || !address) return [];

      const result = await getHistory(client, address as `0x${string}`, range);

      return result.match<HistoryPoint[]>(
        (history) => history,
        (_err)    => [],
      );
    },
    enabled,
    staleTime: 300_000,  // 5 min — history doesn't change fast
    gcTime:    600_000,  // 10 min
    retry:     1,
  });

  return {
    history:    data ?? [],
    isLoading:  enabled ? isLoading  : false,
    isFetching: enabled ? isFetching : false,
    isError:    enabled ? isError    : false,
    hasMoralis,
  };
}
