"use client";

import { useQuery } from "@tanstack/react-query";
import { useAccount, usePublicClient } from "wagmi";
import { formatEther } from "viem";

interface NativeBalanceResult {
  balance:      bigint;
  balanceEther: number;
  isLoading:    boolean;
}

export function useNativeBalance(): NativeBalanceResult {
  const { address }  = useAccount();
  const publicClient = usePublicClient();
  const chainId      = publicClient?.chain?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["nativeBalance", address, chainId],
    queryFn:  async (): Promise<bigint> => {
      if (!publicClient || !address) return 0n;
      return publicClient.getBalance({ address });
    },
    enabled:              !!address && !!publicClient,
    staleTime:            60_000,    // 60 s — native balance is cheap to fetch
    gcTime:              600_000,    // 10 min
    refetchInterval:     120_000,    // background refresh every 2 min
    refetchOnWindowFocus: false,
  });

  const balance      = data ?? 0n;
  const balanceEther = parseFloat(formatEther(balance));

  return {
    balance,
    balanceEther,
    isLoading: !!address && !!publicClient ? isLoading : false,
  };
}
