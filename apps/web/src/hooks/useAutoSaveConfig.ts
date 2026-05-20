"use client";

import { useMemo } from "react";
import { CONTRACT_ADDRESSES, TESTNET_CONTRACT_ADDRESSES } from "@blin/shared";

function getAddresses(chainId: number) {
  if (chainId in TESTNET_CONTRACT_ADDRESSES)
    return TESTNET_CONTRACT_ADDRESSES[chainId as keyof typeof TESTNET_CONTRACT_ADDRESSES];
  if (chainId in CONTRACT_ADDRESSES)
    return CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES];
  return CONTRACT_ADDRESSES[1];
}
import { useUserStore } from "@/store/userStore";
import { useBlinClient } from "./useBlinClient";

// Month → seconds
const MONTHS_TO_SECS: Record<number, bigint> = {
  1:  BigInt(30  * 86400),
  3:  BigInt(90  * 86400),
  6:  BigInt(180 * 86400),
  12: BigInt(365 * 86400),
  24: BigInt(730 * 86400),
};

export interface AutoSaveConfigResult {
  /** Whether the SaveSwap contract is deployed on this chain. */
  contractsEnabled:    boolean;
  /** AutoSave toggle — saved in localStorage. */
  autoSaveEnabled:     boolean;
  /** Save percentage 1–50. */
  savePercent:         number;
  /** saveBps = savePercent * 100 (for contract calls). */
  saveBps:             number;
  /** Lock duration in months. */
  lockDurationMonths:  number;
  /** Lock duration in seconds (bigint for contract calls). */
  lockDurationSeconds: bigint;
  setAutoSave:      (enabled: boolean) => void;
  setSavePercent:   (pct: number) => void;
  setLockDuration:  (months: number) => void;
}

export function useAutoSaveConfig(): AutoSaveConfigResult {
  const client = useBlinClient();

  const {
    autoSaveEnabled,
    savePercent,
    lockDuration,
    setProfile,
  } = useUserStore();

  // Is SaveSwap deployed on this chain?
  const contractsEnabled = useMemo(() => {
    if (!client) return false;
    return (
      getAddresses(client.chainId).saveSwap !==
      "0x0000000000000000000000000000000000000000"
    );
  }, [client]);

  const lockDurationSeconds = MONTHS_TO_SECS[lockDuration] ?? MONTHS_TO_SECS[3]!;

  return {
    contractsEnabled,
    autoSaveEnabled,
    savePercent,
    saveBps:             savePercent * 100,
    lockDurationMonths:  lockDuration,
    lockDurationSeconds,
    setAutoSave:     (enabled) => setProfile({ autoSaveEnabled: enabled }),
    setSavePercent:  (pct)     => setProfile({ savePercent: Math.max(1, Math.min(50, pct)) }),
    setLockDuration: (months)  => setProfile({ lockDuration: months }),
  };
}
