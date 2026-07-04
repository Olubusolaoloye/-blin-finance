"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { useNotifications } from "@/components/notifications/NotificationContext";
import type { TxEntry } from "@/app/api/transactions/route";

export type { TxEntry };

// Re-export as AlchemyTransfer so dashboard / other consumers don't need to change.
export type AlchemyTransfer = TxEntry;

interface TransfersResult {
  transfers:  AlchemyTransfer[];
  isLoading:  boolean;
  isFetching: boolean;
}

export function useAlchemyTransfers(maxCount = 20): TransfersResult {
  // Use wagmi address; fall back to Privy embedded-wallet address so the
  // query isn't disabled during the brief wagmi reconnect window.
  const { address: wagmiAddress } = useAccount();
  const { user } = usePrivy();
  const address = wagmiAddress ?? (user?.wallet?.address as `0x${string}` | undefined);

  const { addNotification } = useNotifications();
  const seenRef        = useRef<Set<string>>(new Set());
  const initialisedRef = useRef(false);

  const enabled = !!address;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["transactions", address],
    queryFn:  async (): Promise<AlchemyTransfer[]> => {
      if (!address) return [];
      const res = await fetch(`/api/transactions?address=${address}`);
      if (!res.ok) {
        console.warn("[useAlchemyTransfers] /api/transactions returned", res.status);
        return [];
      }
      const json = await res.json() as { transactions: AlchemyTransfer[] };
      return (json.transactions ?? []).slice(0, maxCount);
    },
    enabled,
    staleTime:            60_000,   // 1 min
    gcTime:            1_800_000,
    refetchInterval:      60_000,   // poll every 60 s
    refetchOnWindowFocus: true,     // refresh immediately when user returns to tab
    retry: 1,
  });

  // Fire toast notifications for brand-new transactions (not on initial load).
  useEffect(() => {
    if (!data || data.length === 0) return;

    if (!initialisedRef.current) {
      // First load — seed the seen set without toasting historical txs.
      data.forEach((tx) => seenRef.current.add(tx.id));
      initialisedRef.current = true;
      return;
    }

    for (const tx of data) {
      if (!seenRef.current.has(tx.id)) {
        seenRef.current.add(tx.id);
        addNotification({
          type:    tx.isPositive ? "success" : "info",
          title:   tx.title,
          message: tx.amount,
        });
      }
    }
  }, [data, addNotification]);

  return {
    transfers:  data ?? [],
    isLoading:  enabled ? isLoading  : false,
    isFetching: enabled ? isFetching : false,
  };
}
