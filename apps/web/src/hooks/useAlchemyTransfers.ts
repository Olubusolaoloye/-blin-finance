"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { useNotifications } from "@/components/notifications/NotificationContext";

const API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ?? "";

// Networks to scan. Each is tried independently — a failure on one never
// prevents results from the other.
const NETWORKS: Array<{ slug: string; label: string }> = [
  { slug: "eth-mainnet", label: "Ethereum" },
  { slug: "bnb-mainnet", label: "BNB Chain" },
];

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
  uniqueId:   string;
  blockNum:   string;
  hash:       string;
  from:       string;
  to:         string;
  value:      number | null;
  asset:      string | null;
  category:   string;
  metadata?:  { blockTimestamp?: string };
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

// Fetch one direction (from/to) from one network.
// Returns [] on ANY error — a bad network slug must never crash the whole hook.
async function fetchOneDirection(
  wallet:    string,
  slug:      string,
  direction: "from" | "to",
  maxCount:  number,
): Promise<RawTransfer[]> {
  try {
    const params: Record<string, unknown> = {
      category:     ["erc20", "external", "internal"],
      withMetadata: true,
      maxCount:     `0x${maxCount.toString(16)}`,
      order:        "desc",
      ...(direction === "from" ? { fromAddress: wallet } : { toAddress: wallet }),
    };

    const res = await fetch(`https://${slug}.g.alchemy.com/v2/${API_KEY}`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        id:      1,
        jsonrpc: "2.0",
        method:  "alchemy_getAssetTransfers",
        params:  [params],
      }),
    });

    if (!res.ok) return [];

    const json = await res.json();

    // Alchemy returns 200 with { error: {...} } for permission/auth errors —
    // must check the JSON body, not just the HTTP status.
    if (json.error) {
      console.warn(`[transfers] ${slug} ${direction} error:`, json.error.message ?? json.error);
      return [];
    }

    return (json.result?.transfers as RawTransfer[]) ?? [];
  } catch (err) {
    // Network-level error (DNS failure, fetch abort, etc.) — log and move on.
    console.warn(`[transfers] ${slug} ${direction} fetch failed:`, err);
    return [];
  }
}

function mapTransfer(raw: RawTransfer, wallet: string, slug: string): AlchemyTransfer {
  const isSend = raw.from?.toLowerCase() === wallet.toLowerCase();
  const type: "send" | "receive" = isSend ? "send" : "receive";
  const asset = raw.asset ?? "ETH";
  const value = raw.value ?? 0;
  const amountStr = value > 0
    ? `${value.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${asset}`
    : asset;

  return {
    id:         `${slug}:${raw.uniqueId}`,
    type,
    title:      type === "send" ? `Sent ${asset}` : `Received ${asset}`,
    date:       formatDate(raw.metadata?.blockTimestamp),
    amount:     amountStr,
    usdValue:   "$0.00",
    isPositive: type === "receive",
    hash:       raw.hash,
    asset,
    category:   raw.category,
    network:    slug,
  };
}

interface AlchemyTransfersResult {
  transfers:  AlchemyTransfer[];
  isLoading:  boolean;
  isFetching: boolean;
}

export function useAlchemyTransfers(maxCount = 20): AlchemyTransfersResult {
  // Prefer wagmi address; fall back to Privy embedded-wallet address.
  // During the brief window where wagmi hasn't reconnected yet, Privy still
  // has the address so the query doesn't get disabled unnecessarily.
  const { address: wagmiAddress } = useAccount();
  const { user } = usePrivy();
  const address = wagmiAddress ?? (user?.wallet?.address as `0x${string}` | undefined);

  const { addNotification } = useNotifications();
  const seenRef        = useRef<Set<string>>(new Set());
  const initialisedRef = useRef(false);

  const enabled = !!address && !!API_KEY;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["alchemyTransfers", address, maxCount],
    queryFn:  async (): Promise<AlchemyTransfer[]> => {
      if (!address || !API_KEY) return [];

      // Each network is fetched independently — if one throws the others still succeed.
      const perNetwork = await Promise.all(
        NETWORKS.map(async ({ slug }) => {
          // Fetch incoming + outgoing in parallel; each call returns [] on error.
          const [incoming, outgoing] = await Promise.all([
            fetchOneDirection(address, slug, "to",   maxCount),
            fetchOneDirection(address, slug, "from", maxCount),
          ]);

          // Deduplicate by uniqueId (same tx can appear in both directions when
          // the sender and receiver are the same address).
          const seen  = new Set<string>();
          const deduped: RawTransfer[] = [];
          for (const tx of [...incoming, ...outgoing]) {
            if (!seen.has(tx.uniqueId)) {
              seen.add(tx.uniqueId);
              deduped.push(tx);
            }
          }

          return deduped.map((tx) => mapTransfer(tx, address, slug));
        }),
      );

      const all = perNetwork.flat();

      // Sort newest-first by blockTimestamp (block numbers aren't comparable across chains).
      all.sort((a, b) => {
        const parse = (d: string) =>
          d.startsWith("Today")     ? Date.now()
          : d.startsWith("Yesterday") ? Date.now() - 86_400_000
          : new Date(d).getTime();
        return parse(b.date) - parse(a.date);
      });

      return all.slice(0, maxCount);
    },
    enabled,
    staleTime:            60_000,
    gcTime:            1_800_000,
    refetchInterval:      60_000,   // poll every 60 s to catch new txs quickly
    refetchOnWindowFocus: true,     // refresh immediately when user returns to tab
    retry: 1,
  });

  // Fire toast only for brand-new incoming transactions (not on initial load).
  useEffect(() => {
    if (!data || data.length === 0) return;

    if (!initialisedRef.current) {
      data.forEach((tx) => seenRef.current.add(tx.id));
      initialisedRef.current = true;
      return;
    }

    for (const tx of data) {
      if (!seenRef.current.has(tx.id)) {
        seenRef.current.add(tx.id);
        // Notify for both incoming and outgoing so the user knows their send confirmed.
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
