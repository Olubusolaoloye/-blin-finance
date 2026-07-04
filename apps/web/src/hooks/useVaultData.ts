"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { formatUnits } from "viem";
import type { Address } from "viem";
import type { VaultLock } from "@blin/sdk";
import { getUserVault, listLocks } from "@blin/sdk";
import { CONTRACT_ADDRESSES, TESTNET_CONTRACT_ADDRESSES } from "@blin/shared";
import { useBlinClient } from "./useBlinClient";

function getAddresses(chainId: number) {
  if (chainId in TESTNET_CONTRACT_ADDRESSES)
    return TESTNET_CONTRACT_ADDRESSES[chainId as keyof typeof TESTNET_CONTRACT_ADDRESSES];
  if (chainId in CONTRACT_ADDRESSES)
    return CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES];
  return CONTRACT_ADDRESSES[1]; // fallback
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VaultDataResult {
  /** True when VaultFactory is deployed on this chain (non-zero address). */
  vaultEnabled:   boolean;
  /** The user's vault address, or null if not yet created. */
  vaultAddress:   Address | null;
  /** All locks (including broken/matured). */
  locks:          VaultLock[];
  /** Locks that are currently time-locked (not broken, not matured). */
  activeLocks:    VaultLock[];
  /** Locks that have matured and are ready to withdraw. */
  readyLocks:     VaultLock[];
  /** Sum of all active lock principals in atomic units. */
  totalSaved:     bigint;
  /** Human-readable total (asset decimals already applied). */
  totalSavedHuman: number;
  /** The vault's underlying token symbol (e.g. "USDC"). */
  assetSymbol:    string;
  /** Vault asset decimals. */
  assetDecimals:  number;
  isLoading:      boolean;
  isFetching:     boolean;
  refetch:        () => void;
}

// Asset symbol/decimals per chain (including testnets)
const ASSET_SYMBOL: Record<number, string>   = {
  1: "USDC", 56: "USDT", 42161: "USDC",
  421614: "mUSDC",  // MockERC20 on Arbitrum Sepolia
  97:     "mUSDC",  // MockERC20 on BSC Testnet (6 decimals, same as Arb Sepolia)
};
const ASSET_DECIMALS: Record<number, number> = {
  1: 6, 56: 18, 42161: 6,
  421614: 6,
  97:     6,
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useVaultData(): VaultDataResult {
  const { address } = useAccount();
  const client      = useBlinClient();

  const chainId = client?.chainId ?? 1;

  // ── Is VaultFactory deployed on this chain? ───────────────────────────────
  const vaultEnabled = useMemo(() => {
    if (!client) return false;
    return (
      getAddresses(client.chainId).vaultFactory !==
      "0x0000000000000000000000000000000000000000"
    );
  }, [client]);

  // ── Fetch user's vault address ────────────────────────────────────────────
  const { data: vaultAddress, isLoading: vaultLoading } = useQuery({
    queryKey:  ["vaultAddress", address, chainId],
    queryFn:   async (): Promise<Address | null> => {
      if (!client || !address) return null;
      return getUserVault(client, address as Address).match(
        (v) => v,
        () => null,
      );
    },
    enabled:              !!address && !!client && vaultEnabled,
    staleTime:            0,        // always re-check: getVault() returns a fake
                                    // prediction before deployment, so we can't
                                    // afford to serve a stale wrong address
    gcTime:              60_000,
    refetchOnWindowFocus: true,
  });

  // ── Fetch all locks ───────────────────────────────────────────────────────
  const {
    data: locks,
    isLoading: locksLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey:  ["vaultLocks", vaultAddress, address, chainId],
    queryFn:   async (): Promise<VaultLock[]> => {
      if (!client || !vaultAddress || !address) return [];
      return listLocks(client, vaultAddress, address as Address).match(
        (l) => l,
        () => [],
      );
    },
    enabled:              !!client && !!vaultAddress && !!address,
    staleTime:            30_000,
    gcTime:              300_000,
    refetchInterval:      60_000,
    refetchOnWindowFocus: false,
  });

  // ── Derived values ────────────────────────────────────────────────────────
  const assetSymbol   = ASSET_SYMBOL[chainId]   ?? "USDC";
  const assetDecimals = ASSET_DECIMALS[chainId] ?? 6;

  const allLocks   = locks ?? [];
  const nowSec     = BigInt(Math.floor(Date.now() / 1000));
  const activeLocks = allLocks.filter((l) => !l.settled && l.lockedUntil > nowSec);
  const readyLocks  = allLocks.filter((l) => !l.settled && l.lockedUntil <= nowSec);
  const totalSaved  = activeLocks.reduce((sum, l) => sum + l.principal, 0n);
  const totalSavedHuman = parseFloat(formatUnits(totalSaved, assetDecimals));

  return {
    vaultEnabled,
    vaultAddress:    vaultAddress ?? null,
    locks:           allLocks,
    activeLocks,
    readyLocks,
    totalSaved,
    totalSavedHuman,
    assetSymbol,
    assetDecimals,
    isLoading:  (vaultEnabled && (vaultLoading || locksLoading)),
    isFetching,
    refetch,
  };
}
