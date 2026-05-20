"use client";

import { useQuery } from "@tanstack/react-query";
import { useAccount, useChainId } from "wagmi";

const API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ?? "";

const NETWORK_SLUG: Record<number, string> = {
  1: "eth-mainnet",
  56: "bnb-mainnet",
  42161: "arb-mainnet",
};

export interface AlchemyTransfer {
  id: string;
  type: "receive" | "send";
  title: string;
  date: string;
  amount: string;
  usdValue: string;
  isPositive: boolean;
  hash: string;
  asset: string;
  category: string;
}

interface RawTransfer {
  uniqueId: string;
  blockNum: string;
  hash: string;
  from: string;
  to: string;
  value: number | null;
  asset: string | null;
  category: string;
  metadata?: { blockTimestamp?: string };
  rawContract?: { value?: string; decimal?: string };
}

function formatDate(isoTimestamp?: string): string {
  if (!isoTimestamp) return "Unknown date";

  const date = new Date(isoTimestamp);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const txDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const diffMs = today.getTime() - txDay.getTime();
  const diffDays = Math.round(diffMs / 86400000);

  if (diffDays === 0) return `Today, ${timeStr}`;
  if (diffDays === 1) return `Yesterday, ${timeStr}`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  }) + `, ${timeStr}`;
}

async function fetchTransfers(
  walletAddress: string,
  network: string,
  direction: "from" | "to",
  maxCount: number,
): Promise<RawTransfer[]> {
  const params: Record<string, unknown> = {
    category: ["erc20", "external", "internal"],
    withMetadata: true,
    maxCount: `0x${maxCount.toString(16)}`,
  };

  if (direction === "from") {
    params.fromAddress = walletAddress;
  } else {
    params.toAddress = walletAddress;
  }

  const res = await fetch(
    `https://${network}.g.alchemy.com/v2/${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: 1,
        jsonrpc: "2.0",
        method: "alchemy_getAssetTransfers",
        params: [params],
      }),
    },
  );

  if (!res.ok) return [];

  const json = await res.json();
  return (json.result?.transfers as RawTransfer[]) ?? [];
}

function mapTransfer(raw: RawTransfer, walletAddress: string): AlchemyTransfer {
  const isSend = raw.from?.toLowerCase() === walletAddress.toLowerCase();
  const type: "send" | "receive" = isSend ? "send" : "receive";
  const asset = raw.asset ?? "ETH";

  const value = raw.value ?? 0;
  const amountStr = value > 0
    ? `${value.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${asset}`
    : `${asset}`;

  const title = type === "send" ? `Sent ${asset}` : `Received ${asset}`;
  const date = formatDate(raw.metadata?.blockTimestamp);

  return {
    id: raw.uniqueId,
    type,
    title,
    date,
    amount: amountStr,
    usdValue: "$0.00",
    isPositive: type === "receive",
    hash: raw.hash,
    asset,
    category: raw.category,
  };
}

interface AlchemyTransfersResult {
  transfers: AlchemyTransfer[];
  isLoading: boolean;
  isFetching: boolean;
}

export function useAlchemyTransfers(maxCount = 20): AlchemyTransfersResult {
  const { address } = useAccount();
  const chainId = useChainId();

  const network = NETWORK_SLUG[chainId] ?? "eth-mainnet";

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["alchemyTransfers", address, chainId, maxCount],
    queryFn: async (): Promise<AlchemyTransfer[]> => {
      if (!address || !API_KEY) return [];

      const [incoming, outgoing] = await Promise.all([
        fetchTransfers(address, network, "to", maxCount),
        fetchTransfers(address, network, "from", maxCount),
      ]);

      const seen = new Set<string>();
      const combined: RawTransfer[] = [];

      for (const tx of [...incoming, ...outgoing]) {
        if (!seen.has(tx.uniqueId)) {
          seen.add(tx.uniqueId);
          combined.push(tx);
        }
      }

      combined.sort((a, b) => {
        const blockA = parseInt(a.blockNum, 16);
        const blockB = parseInt(b.blockNum, 16);
        return blockB - blockA;
      });

      return combined.map((tx) => mapTransfer(tx, address));
    },
    enabled:              !!address && !!API_KEY,
    staleTime:            300_000,   // 5 min — tx history changes rarely
    gcTime:             1_800_000,   // 30 min in memory
    refetchInterval:      300_000,   // background poll every 5 min
    refetchOnWindowFocus: false,
  });

  return {
    transfers: data ?? [],
    isLoading: !!address && !!API_KEY ? isLoading : false,
    isFetching: !!address && !!API_KEY ? isFetching : false,
  };
}
