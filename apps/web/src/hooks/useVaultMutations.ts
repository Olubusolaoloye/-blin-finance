"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { parseUnits } from "viem";
import type { Address } from "viem";
import {
  createLock as sdkCreateLock,
  topUp      as sdkTopUp,
  withdraw   as sdkWithdraw,
  breakLock  as sdkBreakLock,
  renameLock as sdkRenameLock,
} from "@blin/sdk";
import { CONTRACT_ADDRESSES, TESTNET_CONTRACT_ADDRESSES } from "@blin/shared";

function getAddresses(chainId: number) {
  if (chainId in TESTNET_CONTRACT_ADDRESSES)
    return TESTNET_CONTRACT_ADDRESSES[chainId as keyof typeof TESTNET_CONTRACT_ADDRESSES];
  if (chainId in CONTRACT_ADDRESSES)
    return CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES];
  return CONTRACT_ADDRESSES[1];
}
import { VAULT_FACTORY_ABI } from "@blin/sdk";
import { useBlinClient } from "./useBlinClient";
import { useNotifications } from "@/components/notifications/NotificationContext";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateLockParams {
  name:               string;
  amount:             string;   // human-readable (e.g. "500")
  lockDurationSeconds: bigint;
  assetDecimals:      number;
}

export interface VaultMutationsResult {
  /** Create a new time-locked savings position. Auto-deploys vault if needed. */
  createLock:  ReturnType<typeof useMutation<Address, Error, CreateLockParams>>;
  /** Add more principal to an existing lock. */
  topUp:       ReturnType<typeof useMutation<void, Error, { lockId: bigint; amount: string; vaultAddress: Address; assetDecimals: number }>>;
  /** Withdraw a matured lock (principal + yield). */
  withdraw:    ReturnType<typeof useMutation<void, Error, { lockId: bigint; vaultAddress: Address }>>;
  /** Break a lock early (incurs 15% penalty). */
  breakLock:   ReturnType<typeof useMutation<void, Error, { lockId: bigint; vaultAddress: Address }>>;
  /** Rename a lock. */
  renameLock:  ReturnType<typeof useMutation<void, Error, { lockId: bigint; name: string; vaultAddress: Address }>>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useVaultMutations(vaultAddress: Address | null): VaultMutationsResult {
  const client       = useBlinClient();
  const { address }  = useAccount();
  const qc           = useQueryClient();
  const { addNotification } = useNotifications();

  const chainId       = client?.chainId ?? 1;
  const factoryAddr   = getAddresses(chainId).vaultFactory as Address;

  // ── Helper: ensure vault exists, returning its REAL on-chain address ────
  //
  // IMPORTANT: We never trust the React-cached `vaultAddress` prop here.
  // `VaultFactory.getVault()` returns _predictAddress(user) — a non-zero but
  // wrong CREATE2 prediction — before any vault is deployed. That fake address
  // ends up in the TanStack Query cache and will short-circuit the old
  // `if (vaultAddress) return vaultAddress` check.
  //
  // Instead we always call hasVault() on-chain to know the true state:
  //   • deployed  → read real address from _vaults[user] via getVault()
  //   • not yet   → call getOrCreateVault(), wait for mining, then read address
  const ensureVault = async (): Promise<Address> => {
    if (!client?.walletClient?.account || !address) {
      throw new Error("Wallet not connected");
    }

    // 1. Is the vault actually deployed on-chain?
    const isDeployed = await client.publicClient.readContract({
      address:      factoryAddr,
      abi:          VAULT_FACTORY_ABI,
      functionName: "hasVault",
      args:         [address as Address],
    }) as boolean;

    if (isDeployed) {
      // Vault exists — return the real stored address (never the prediction)
      return client.publicClient.readContract({
        address:      factoryAddr,
        abi:          VAULT_FACTORY_ABI,
        functionName: "getVault",
        args:         [address as Address],
      }) as Promise<Address>;
    }

    // 2. Vault not yet deployed — create it now
    const { request } = await client.publicClient.simulateContract({
      address:      factoryAddr,
      abi:          VAULT_FACTORY_ABI,
      functionName: "getOrCreateVault",
      args:         [address as Address],
      account:      address as Address,
    });
    const deployHash = await client.walletClient.writeContract(request);

    // Wait for the deployment tx to be mined before reading the address.
    // Without this, getVault() still returns the wrong CREATE2 prediction.
    await client.publicClient.waitForTransactionReceipt({ hash: deployHash });

    // 3. Read the real vault address from _vaults[user]
    const newAddr = await client.publicClient.readContract({
      address:      factoryAddr,
      abi:          VAULT_FACTORY_ABI,
      functionName: "getVault",
      args:         [address as Address],
    }) as Address;

    // Bust the UI cache so the vault page reflects the new address immediately
    qc.invalidateQueries({ queryKey: ["vaultAddress"] });
    return newAddr;
  };

  // ── Create lock ───────────────────────────────────────────────────────────
  const createLock = useMutation<Address, Error, CreateLockParams>({
    mutationFn: async ({ name, amount, lockDurationSeconds, assetDecimals }) => {
      if (!client) throw new Error("Client not initialised");
      const vault    = await ensureVault();
      const amountWei = parseUnits(amount, assetDecimals);
      await sdkCreateLock(client, {
        vaultAddress:        vault,
        amount:              amountWei,
        lockDurationSeconds,
        name,
      }).write();
      return vault;
    },
    onSuccess: () => {
      addNotification({ title: "Lock Created!", message: "Your savings lock is now active and earning yield.", type: "success" });
      qc.invalidateQueries({ queryKey: ["vaultLocks"] });
      qc.invalidateQueries({ queryKey: ["vaultAddress"] });
    },
    onError: (err) => {
      addNotification({ title: "Transaction Failed", message: err.message ?? "Lock creation failed.", type: "alert" });
    },
  });

  // ── Top up ────────────────────────────────────────────────────────────────
  const topUp = useMutation<void, Error, { lockId: bigint; amount: string; vaultAddress: Address; assetDecimals: number }>({
    mutationFn: async ({ lockId, amount, vaultAddress: vault, assetDecimals }) => {
      if (!client) throw new Error("Client not initialised");
      await sdkTopUp(client, {
        vaultAddress: vault,
        lockId,
        amount: parseUnits(amount, assetDecimals),
      }).write();
    },
    onSuccess: () => {
      addNotification({ title: "Top Up Successful!", message: "Funds added to your lock.", type: "success" });
      qc.invalidateQueries({ queryKey: ["vaultLocks"] });
    },
    onError: (err) => {
      addNotification({ title: "Top Up Failed", message: err.message, type: "alert" });
    },
  });

  // ── Withdraw ──────────────────────────────────────────────────────────────
  const withdraw = useMutation<void, Error, { lockId: bigint; vaultAddress: Address }>({
    mutationFn: async ({ lockId, vaultAddress: vault }) => {
      if (!client) throw new Error("Client not initialised");
      await sdkWithdraw(client, { vaultAddress: vault, lockId }).write();
    },
    onSuccess: () => {
      addNotification({ title: "Withdrawal Successful!", message: "Funds returned to your wallet.", type: "success" });
      qc.invalidateQueries({ queryKey: ["vaultLocks"] });
    },
    onError: (err) => {
      addNotification({ title: "Withdrawal Failed", message: err.message, type: "alert" });
    },
  });

  // ── Break lock ────────────────────────────────────────────────────────────
  const breakLock = useMutation<void, Error, { lockId: bigint; vaultAddress: Address }>({
    mutationFn: async ({ lockId, vaultAddress: vault }) => {
      if (!client) throw new Error("Client not initialised");
      await sdkBreakLock(client, { vaultAddress: vault, lockId }).write();
    },
    onSuccess: () => {
      addNotification({ title: "Lock Broken", message: "Funds returned after 15% early-exit penalty.", type: "alert" });
      qc.invalidateQueries({ queryKey: ["vaultLocks"] });
    },
    onError: (err) => {
      addNotification({ title: "Transaction Failed", message: err.message, type: "alert" });
    },
  });

  // ── Rename lock ───────────────────────────────────────────────────────────
  const renameLock = useMutation<void, Error, { lockId: bigint; name: string; vaultAddress: Address }>({
    mutationFn: async ({ lockId, name, vaultAddress: vault }) => {
      if (!client) throw new Error("Client not initialised");
      await sdkRenameLock(client, { vaultAddress: vault, lockId, name }).write();
    },
    onSuccess: () => {
      addNotification({ title: "Lock Renamed", message: "Lock name updated.", type: "success" });
      qc.invalidateQueries({ queryKey: ["vaultLocks"] });
    },
    onError: (err) => {
      addNotification({ title: "Rename Failed", message: err.message, type: "alert" });
    },
  });

  return { createLock, topUp, withdraw, breakLock, renameLock };
}
