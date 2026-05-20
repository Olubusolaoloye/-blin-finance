"use client";

import { useState, useCallback } from "react";
import type { Token } from "@/lib/tokens";

// ─── localStorage helpers ─────────────────────────────────────────────────────

function storageKey(chainId: number): string {
  return `blin-custom-tokens-${chainId}`;
}

function loadTokens(chainId: number): Token[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(chainId));
    return raw ? (JSON.parse(raw) as Token[]) : [];
  } catch {
    return [];
  }
}

function saveTokens(chainId: number, tokens: Token[]): void {
  try {
    localStorage.setItem(storageKey(chainId), JSON.stringify(tokens));
  } catch {
    /* quota exceeded — silently skip */
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseCustomTokensResult {
  customTokens: Token[];
  addToken:     (token: Token) => void;
  removeToken:  (address: string) => void;
  hasToken:     (address: string) => boolean;
}

/**
 * Persists user-added tokens per chain in localStorage.
 * Survives page refreshes; scoped to each chainId.
 */
export function useCustomTokens(chainId: number): UseCustomTokensResult {
  const [customTokens, setCustomTokens] = useState<Token[]>(() => loadTokens(chainId));

  const addToken = useCallback((token: Token) => {
    setCustomTokens((prev) => {
      if (prev.some((t) => t.address.toLowerCase() === token.address.toLowerCase())) {
        return prev; // already present
      }
      const next = [...prev, token];
      saveTokens(chainId, next);
      return next;
    });
  }, [chainId]);

  const removeToken = useCallback((address: string) => {
    setCustomTokens((prev) => {
      const next = prev.filter(
        (t) => t.address.toLowerCase() !== address.toLowerCase(),
      );
      saveTokens(chainId, next);
      return next;
    });
  }, [chainId]);

  const hasToken = useCallback(
    (address: string) =>
      customTokens.some((t) => t.address.toLowerCase() === address.toLowerCase()),
    [customTokens],
  );

  return { customTokens, addToken, removeToken, hasToken };
}
