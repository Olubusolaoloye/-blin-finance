"use client";

import { useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type VaultHistoryAction = "create" | "topup" | "withdraw" | "break" | "swap-save";

export interface VaultHistoryEntry {
  id:        string;
  action:    VaultHistoryAction;
  txHash:    string;
  amount:    string;   // human-readable, e.g. "50.00"
  symbol:    string;   // "USDC" / "mUSDC" / "USDT"
  lockId?:   string;   // bigint as string
  lockName?: string;
  timestamp: number;   // ms since epoch
  chainId:   number;
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

function storageKey(chainId: number, address: string): string {
  return `blin-vault-history-${chainId}-${address.toLowerCase()}`;
}

function loadHistory(chainId: number, address: string): VaultHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(chainId, address));
    return raw ? (JSON.parse(raw) as VaultHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function persistHistory(chainId: number, address: string, entries: VaultHistoryEntry[]): void {
  try {
    localStorage.setItem(storageKey(chainId, address), JSON.stringify(entries));
  } catch { /* quota exceeded — silently skip */ }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useVaultHistory(chainId: number, address?: string) {
  const [entries, setEntries] = useState<VaultHistoryEntry[]>(() =>
    address ? loadHistory(chainId, address) : [],
  );

  const addEntry = useCallback(
    (entry: Omit<VaultHistoryEntry, "id" | "timestamp">) => {
      if (!address) return;
      const newEntry: VaultHistoryEntry = {
        ...entry,
        id:        `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
      };
      setEntries((prev) => {
        const next = [newEntry, ...prev].slice(0, 50); // keep newest 50
        persistHistory(chainId, address, next);
        return next;
      });
    },
    [chainId, address],
  );

  return { entries, addEntry };
}
