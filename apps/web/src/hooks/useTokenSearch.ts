"use client";

import { useState, useEffect } from "react";
import { useChainId } from "wagmi";
import type { Address } from "viem";
import type { SupportedChainId } from "@blin/shared";
import type { Token } from "@/lib/tokens";

// ─── Constants ────────────────────────────────────────────────────────────────

const API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ?? "";

const NETWORK_SLUG: Record<number, string> = {
  1:     "eth-mainnet",
  56:    "bnb-mainnet",
  42161: "arb-mainnet",
};

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

// ─── Alchemy token metadata ───────────────────────────────────────────────────

interface AlchemyTokenMetadataResult {
  decimals: number | null;
  logo:     string | null;
  name:     string | null;
  symbol:   string | null;
}

async function fetchTokenMetadata(
  contractAddress: string,
  chainId: SupportedChainId,
): Promise<Token | null> {
  const network = NETWORK_SLUG[chainId] ?? "eth-mainnet";
  const url = `https://${network}.g.alchemy.com/v2/${API_KEY}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id:      1,
      jsonrpc: "2.0",
      method:  "alchemy_getTokenMetadata",
      params:  [contractAddress],
    }),
  });

  if (!res.ok) return null;

  const json = await res.json() as { result?: AlchemyTokenMetadataResult };
  const meta = json.result;

  if (!meta?.symbol || meta.decimals == null) return null;

  return {
    symbol:   meta.symbol.toUpperCase(),
    name:     meta.name ?? meta.symbol,
    address:  contractAddress as Address,
    decimals: meta.decimals,
    chainId:  chainId as SupportedChainId,
    ...(meta.logo ? { logoUrl: meta.logo } : {}),
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface TokenSearchResult {
  resolvedToken:  Token | null;
  isSearching:    boolean;
  searchError:    string | null;
  isAddressQuery: boolean;
}

/**
 * When `query` is a valid 42-character Ethereum address this hook fetches
 * the token metadata from Alchemy and returns the resolved Token.
 * For normal text queries it returns `isAddressQuery: false` and lets the
 * caller handle client-side filtering.
 */
export function useTokenSearch(query: string): TokenSearchResult {
  const wagmiChainId = useChainId();
  const chainId = ([1, 56, 42161].includes(wagmiChainId)
    ? wagmiChainId
    : 1) as SupportedChainId;

  const [resolvedToken, setResolvedToken] = useState<Token | null>(null);
  const [isSearching,   setIsSearching]   = useState(false);
  const [searchError,   setSearchError]   = useState<string | null>(null);

  const isAddressQuery = ADDRESS_RE.test(query.trim());

  useEffect(() => {
    // Reset on every query change
    setResolvedToken(null);
    setSearchError(null);

    if (!isAddressQuery || !query.trim() || !API_KEY) return;

    let cancelled = false;
    setIsSearching(true);

    fetchTokenMetadata(query.trim(), chainId)
      .then((token) => {
        if (cancelled) return;
        if (token) {
          setResolvedToken(token);
        } else {
          setSearchError("Token not found on this network. Check the contract address.");
        }
      })
      .catch(() => {
        if (!cancelled) setSearchError("Failed to fetch token info. Try again.");
      })
      .finally(() => {
        if (!cancelled) setIsSearching(false);
      });

    return () => { cancelled = true; };
  }, [query, chainId, isAddressQuery]);

  return { resolvedToken, isSearching, searchError, isAddressQuery };
}
