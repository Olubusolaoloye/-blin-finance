"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { useNotifications } from "@/components/notifications/NotificationContext";

const API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ?? "";

// Always scan BOTH chains — same EVM address exists on both.
// Block numbers are not comparable cross-chain so we sort by timestamp.
const NETWORKS_TO_SCAN = ["eth-mainnet", "bnb-mainnet"] as const;

export interface AlchemyTransfer {
  id:         string;
  type:       "receive" | "send";
  title:      string;
  date:       string;
  amount:     string;
  usdValue:   string;
  isPositive: boolean;
  hash:       string;
  asset:      string;
  category:   string;
  network:    string;
}

interface RawTransfer {
  uniqueId:      string;
  blockNum:      string;
  hash:          string;
  from:          string;
  to:            string;
  value:         number | null;
  asset:         string | null;
  category:      string;
  metadata?:     { blockTimestamp?: string };
  rawContract?:  { value?: string; decimal?: string };
}

function formatDate(iso?: string): string {
  if (!iso) return "Unknown date";
  const date = new Date(iso);
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const txDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const timeStr = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  const diff = Math.round((today.getTime() - txDay.getTime()) / 86_400_000);
  if (diff === 0) return `Today, ${timeStr}`;
  if (diff === 1) return `Yesterday, ${timeStr}`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + `, ${timeStr}`;
}

async function fetchTransfers(
  wallet:    string,
  network:   string,
  direction: "from" | "to",
  maxCount:  number,
): Promise<RawTransfer[]> {
  const params: Record<string, unknown> = {
    category:     ["erc20", "external", "internal"],
    withMetadata: true,
    maxCount:     `0x${maxCount.toString(16)}`,
    ...(direction === "from" ? { fromAddress: wallet } : { toAddress: wallet }),
  };

  const res = await fetch(`https://${network}.g.alchemy.com/v2/${API_KEY}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ id: 1, jsonrpc: "2.0", method: "alchemy_getAssetTransfers", params: [params] }),
  });

  if (!res.ok) return [];
  const json = await res.json();
  return (json.result?.transfers as RawTransfer[]) ?? [];
}

function mapTransfer(raw: RawTransfer, wallet: string, network: string): AlchemyTransfer {
  const isSend = raw.from?.toLowerCase() === wallet.toLowerCase();
  const type: "send" | "receive" = isSend ? "send" : "receive";
  const asset = raw.asset ?? "ETH";
  const value = raw.value ?? 0;
  const amountStr = value > 0
    ? `${value.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${asset}`
    : asset;

  return {
    id:         `${network}:${raw.uniqueId}`,
    type,
    title:      type === "send" ? `Sent ${asset}` : `Received ${asset}`,
    date:       formatDate(raw.metadata?.blockTimestamp),
    amount:     amountStr,
    usdValue:   "$0.00",
    isPositive: type === "receive",
    hash:       raw.hash,
    asset,
    category:   raw.category,
    network,
  };
}

interface AlchemyTransfersResult {
  transfers:  AlchemyTransfer[];
  isLoading:  boolean;
  isFetching: boolean;
}

export function useAlchemyTransfers(maxCount = 20): AlchemyTransfersResult {
  const { address }        = useAccount();
  const { addNotification } = useNotifications();

  // Track which IDs we have already shown a toast for
  const seenRef       = useRef<Set<string>>(new Set());
  const initialisedRef = useRef(false);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["alchemyTransfers", address, maxCount],
    queryFn:  async (): Promise<AlchemyTransfer[]> => {
      if (!address || !API_KEY) return [];

      // Fetch from all networks in parallel
      const perNetwork = await Promise.all(
        NETWORKS_TO_SCAN.map(async (network) => {
          const [incoming, outgoing] = await Promise.all([
            fetchTransfers(address, network, "to",   maxCount),
            fetchTransfers(address, network, "from", maxCount),
          ]);
          const seen = new Set<string>();
          const deduped: RawTransfer[] = [];
          for (const tx of [...incoming, ...outgoing]) {
            if (!seen.has(tx.uniqueId)) { seen.add(tx.uniqueId); deduped.push(tx); }
          }
          return deduped.map((tx) => mapTransfer(tx, address, network));
        }),
      );

      const all = perNetwork.flat();

      // Sort newest-first by timestamp (block numbers aren't comparable cross-chain)
      all.sort((a, b) => {
        const tsA = a.date.startsWith("Today")     ? Date.now()
                  : a.date.startsWith("Yesterday") ? Date.now() - 86_400_000
                  : new Date(a.date).getTime();
        const tsB = b.date.startsWith("Today")     ? Date.now()
                  : b.date.startsWith("Yesterday") ? Date.now() - 86_400_000
                  : new Date(b.date).getTime();
        return tsB - tsA;
      });

      return all.slice(0, maxCount);
    },
    enabled:              !!address && !!API_KEY,
    staleTime:             60_000,   // 1 min — catch incoming txs quickly
    gcTime:             1_800_000,
    refetchInterval:       60_000,   // poll every 60 s
    refetchOnWindowFocus:  true,     // immediate refresh when user returns to tab
    retry: 1,
  });

  // Fire toast notifications for genuinely new incoming transactions
  useEffect(() => {
    if (!data || data.length === 0) return;

    if (!initialisedRef.current) {
      // First load — populate seen set silently, no toasts for historical txs
      data.forEach((tx) => seenRef.current.add(tx.id));
      initialisedRef.current = true;
      return;
    }

    // On every subsequent poll, notify only for brand-new txs
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

  const enabled = !!address && !!API_KEY;
  return {
    transfers:  data ?? [],
    isLoading:  enabled ? isLoading  : false,
    isFetching: enabled ? isFetching : false,
  };
}
