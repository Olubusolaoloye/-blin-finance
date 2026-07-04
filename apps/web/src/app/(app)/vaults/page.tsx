"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  PiggyBank, Lock, Plus, CheckCircle2, Settings,
  ChevronRight, Loader2, RefreshCw, Droplets,
} from "lucide-react";
import { useAccount } from "wagmi";
import { formatUnits } from "viem";
import type { Address } from "viem";
import type { VaultLock } from "@blin/sdk";
import { BlinButton }    from "@/components/ui/BlinButton";
import { BlinCard }      from "@/components/ui/BlinCard";
import { BlinBadge }     from "@/components/ui/BlinBadge";
import { TokenIcon }     from "@/components/ui/TokenIcon";
import { AmountDisplay } from "@/components/ui/AmountDisplay";
import { ProgressBar }   from "@/components/ui/ProgressBar";
import { BottomSheet }   from "@/components/ui/BottomSheet";
import { useVaultData }      from "@/hooks/useVaultData";
import { useVaultMutations } from "@/hooks/useVaultMutations";
import { useAutoSaveConfig } from "@/hooks/useAutoSaveConfig";

// ─── Duration presets ─────────────────────────────────────────────────────────

const DURATIONS = [
  { label: "1 Month",  months: 1,  secs: BigInt(30  * 86400) },
  { label: "3 Months", months: 3,  secs: BigInt(90  * 86400) },
  { label: "6 Months", months: 6,  secs: BigInt(180 * 86400) },
  { label: "1 Year",   months: 12, secs: BigInt(365 * 86400) },
  { label: "2 Years",  months: 24, secs: BigInt(730 * 86400) },
] as const;

const ESTIMATED_APY = 4.2; // placeholder until live yield data

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAmount(raw: bigint, decimals: number): string {
  return parseFloat(formatUnits(raw, decimals)).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function lockStatus(lock: VaultLock): "Locked" | "Ready" {
  return lock.daysRemaining > 0 ? "Locked" : "Ready";
}

function estimatedYield(amount: bigint, decimals: number, durationSecs: bigint): number {
  const principal = parseFloat(formatUnits(amount, decimals));
  const years     = Number(durationSecs) / (365 * 86400);
  return principal * (ESTIMATED_APY / 100) * years;
}

// ─── Component ────────────────────────────────────────────────────────────────

// Testnets that show the faucet button
const TESTNET_CHAIN_IDS = new Set([421614, 97]);

export default function VaultsPage() {
  const vaultData  = useVaultData();
  const autoSave   = useAutoSaveConfig();
  const { chainId } = useAccount();
  const isTestnet   = chainId !== undefined && TESTNET_CHAIN_IDS.has(chainId);

  const {
    vaultEnabled,
    vaultAddress,
    activeLocks,
    readyLocks,
    locks,
    assetSymbol,
    assetDecimals,
    totalSavedHuman,
    isLoading,
    isFetching,
    refetch,
  } = vaultData;

  const mutations = useVaultMutations(vaultAddress ?? null);

  // ── Sheet visibility ──────────────────────────────────────────────────────

  const [isCreateOpen,   setIsCreateOpen]   = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isTopUpOpen,    setIsTopUpOpen]    = useState(false);
  const [isEditOpen,     setIsEditOpen]     = useState(false);
  const [isBreakOpen,    setIsBreakOpen]    = useState(false);
  const [selectedLock,   setSelectedLock]   = useState<VaultLock | null>(null);
  const [createStep,     setCreateStep]     = useState(0);

  // ── Create lock form state ────────────────────────────────────────────────

  const [createName,     setCreateName]     = useState("");
  const [createAmount,   setCreateAmount]   = useState("");
  const [selectedDurIdx, setSelectedDurIdx] = useState(2); // default 6 months
  const selectedDuration = DURATIONS[selectedDurIdx]!;

  const unlockDate = useMemo(() => {
    const d = new Date();
    d.setSeconds(d.getSeconds() + Number(selectedDuration.secs));
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }, [selectedDuration]);

  const estYield = useMemo(() => {
    const n = parseFloat(createAmount || "0");
    if (isNaN(n) || n === 0) return 0;
    return n * (ESTIMATED_APY / 100) * (Number(selectedDuration.secs) / (365 * 86400));
  }, [createAmount, selectedDuration]);

  // ── Top-up form ───────────────────────────────────────────────────────────
  const [topUpAmount, setTopUpAmount] = useState("");

  // ── Edit form ─────────────────────────────────────────────────────────────
  const [editName, setEditName] = useState("");

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleCreateLock = async () => {
    if (!createName || !createAmount || parseFloat(createAmount) <= 0) return;
    await mutations.createLock.mutateAsync({
      name:               createName,
      amount:             createAmount,
      lockDurationSeconds: selectedDuration.secs,
      assetDecimals,
    });
    setIsCreateOpen(false);
    setCreateStep(0);
    setCreateName("");
    setCreateAmount("");
  };

  const handleConfirmWithdraw = async () => {
    if (!selectedLock || !vaultAddress) return;
    await mutations.withdraw.mutateAsync({
      lockId:       selectedLock.id,
      vaultAddress: vaultAddress as Address,
    });
    setIsWithdrawOpen(false);
    setSelectedLock(null);
  };

  const handleConfirmTopUp = async () => {
    if (!selectedLock || !vaultAddress || !topUpAmount) return;
    await mutations.topUp.mutateAsync({
      lockId:       selectedLock.id,
      amount:       topUpAmount,
      vaultAddress: vaultAddress as Address,
      assetDecimals,
    });
    setIsTopUpOpen(false);
    setTopUpAmount("");
  };

  const handleConfirmEdit = async () => {
    if (!selectedLock || !vaultAddress || !editName) return;
    await mutations.renameLock.mutateAsync({
      lockId:       selectedLock.id,
      name:         editName,
      vaultAddress: vaultAddress as Address,
    });
    setIsEditOpen(false);
  };

  const handleConfirmBreak = async () => {
    if (!selectedLock || !vaultAddress) return;
    await mutations.breakLock.mutateAsync({
      lockId:       selectedLock.id,
      vaultAddress: vaultAddress as Address,
    });
    setIsBreakOpen(false);
    setSelectedLock(null);
  };

  const openNewLock = () => {
    if (!vaultEnabled) return;
    setCreateName("");
    setCreateAmount("");
    setCreateStep(0);
    setIsCreateOpen(true);
  };

  // ── All locks for display ─────────────────────────────────────────────────
  const allDisplayLocks = [...readyLocks, ...activeLocks];
  const activeLockCount = activeLocks.length + readyLocks.length;

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-8 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display font-semibold text-[20px] text-text-primary">Vault &amp; Saves</h1>
        <div className="flex items-center gap-2">
          {isFetching && <RefreshCw size={14} className="text-text-muted animate-spin" />}
          {/* Testnet faucet button — mint 10,000 mUSDC in one tap */}
          {/* Shown whenever on testnet — works before a vault is deployed */}
          {isTestnet && (
            <button
              onClick={() => mutations.claimTestTokens.mutateAsync({ vaultAddress: vaultAddress as Address ?? null })}
              disabled={mutations.claimTestTokens.isPending}
              title="Claim 10,000 free test USDC"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-blue/10 border border-brand-blue/20 text-brand-blue text-[12px] font-semibold hover:bg-brand-blue/20 transition-colors disabled:opacity-50"
            >
              {mutations.claimTestTokens.isPending
                ? <Loader2 size={12} className="animate-spin" />
                : <Droplets size={12} />}
              Get Test Tokens
            </button>
          )}
        </div>
      </div>

      {/* ── AutoSave Section ──────────────────────────────────────────────── */}
      <section>
        {!vaultEnabled ? (
          /* Contracts not deployed yet */
          <BlinCard variant="dark" className="bg-gradient-to-br from-[#1A3C6E] to-[#2E86AB] text-center p-8">
            <PiggyBank size={64} className="text-brand-gold mx-auto mb-4" />
            <h2 className="font-display font-semibold text-[22px] text-white mb-2">AutoSave — Coming Soon</h2>
            <p className="text-[14px] text-white/70 mb-4">
              Save a % of every swap automatically and earn Aave yield while it&apos;s locked.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-[12px] text-white/70 font-medium">
              <div className="w-2 h-2 rounded-full bg-brand-gold animate-pulse" />
              Contracts deploying to mainnet
            </div>
          </BlinCard>
        ) : (
          /* Contracts deployed — show AutoSave config */
          <BlinCard className="p-5 border border-brand-gold/20 bg-gradient-to-br from-brand-gold/[0.03] to-transparent">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${autoSave.autoSaveEnabled ? "bg-brand-gold text-white" : "bg-brand-gold/10 text-brand-gold"}`}>
                  <PiggyBank size={24} />
                </div>
                <div>
                  <div className="font-bold text-[16px]">AutoSave Vault</div>
                  <div className="text-[12px] text-text-secondary">Save {autoSave.savePercent}% of every swap</div>
                </div>
              </div>
              <button
                onClick={() => autoSave.setAutoSave(!autoSave.autoSaveEnabled)}
                className={`w-14 h-7 rounded-full p-1 transition-all duration-300 ${autoSave.autoSaveEnabled ? "bg-brand-gold" : "bg-border-medium"}`}
              >
                <motion.div
                  animate={{ x: autoSave.autoSaveEnabled ? 28 : 0 }}
                  className="w-5 h-5 bg-white rounded-full shadow-md"
                />
              </button>
            </div>

            <AnimatePresence>
              {autoSave.autoSaveEnabled && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-4 border-t border-brand-gold/10 space-y-4">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-[12px] font-bold text-text-secondary uppercase tracking-wider">
                        <span>Save Amount</span>
                        <span className="text-brand-gold">{autoSave.savePercent}%</span>
                      </div>
                      <input
                        type="range" min="1" max="50" step="1"
                        value={autoSave.savePercent}
                        onChange={(e) => autoSave.setSavePercent(parseInt(e.target.value))}
                        className="w-full h-2 bg-border-light rounded-lg appearance-none cursor-pointer accent-brand-gold"
                      />
                      <div className="flex justify-between text-[11px] text-text-muted">
                        <span>1%</span><span>50%</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <div className="text-[12px] font-bold text-text-secondary uppercase tracking-wider">Lock Duration</div>
                      <div className="grid grid-cols-3 gap-2">
                        {[1, 3, 6, 12, 24].map((m) => (
                          <button
                            key={m}
                            onClick={() => autoSave.setLockDuration(m)}
                            className={`py-2 rounded-xl border text-[13px] font-semibold transition-all ${
                              autoSave.lockDurationMonths === m
                                ? "border-brand-gold bg-brand-gold/10 text-brand-gold"
                                : "border-border-light bg-white text-text-secondary hover:border-brand-gold/50"
                            }`}
                          >
                            {m < 12 ? `${m}mo` : m === 12 ? "1yr" : "2yr"}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[13px] bg-surface-raised rounded-xl p-3">
                      <span className="text-text-secondary font-medium">Total locked</span>
                      <span className="font-bold text-brand-navy">
                        {totalSavedHuman.toFixed(2)} {assetSymbol}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </BlinCard>
        )}
      </section>

      {/* ── My Locks Section ──────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-[18px] text-text-primary">My Locks</h2>
            <BlinBadge variant="neutral">{activeLockCount} active</BlinBadge>
          </div>
          <BlinButton
            variant="gold" size="sm" className="h-9 px-4"
            onClick={openNewLock}
            disabled={!vaultEnabled}
          >
            <Plus size={16} className="mr-1" /> New Lock
          </BlinButton>
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="flex flex-col gap-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-36 rounded-2xl bg-border-light animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && allDisplayLocks.length === 0 && (
          <BlinCard className="text-center p-8">
            <Lock size={40} className="mx-auto mb-3 text-border-medium" />
            <h3 className="font-display font-semibold text-[18px] text-text-primary mb-2">No locks yet</h3>
            <p className="text-[14px] text-text-secondary mb-6">
              {vaultEnabled
                ? "Create a lock to save towards a goal and earn Aave yield while your funds are locked."
                : "Vault contracts are being deployed. Check back soon."}
            </p>
            {vaultEnabled && (
              <BlinButton variant="gold" onClick={openNewLock}>
                <Plus size={16} className="mr-1" /> Create Lock
              </BlinButton>
            )}
          </BlinCard>
        )}

        {/* Lock cards */}
        <div className="flex flex-col gap-4">
          {allDisplayLocks.map((lock, i) => {
            const status   = lockStatus(lock);
            const amountFmt = formatAmount(lock.principal, assetDecimals);
            const yieldFmt  = estimatedYield(lock.principal, assetDecimals, lock.lockedUntil - lock.lockedAt).toFixed(2);

            return (
              <motion.div
                key={lock.id.toString()}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.25, ease: "easeOut" }}
              >
                <BlinCard accentLeft accentColor="var(--brand-gold)" className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <span className="font-bold text-[15px] text-text-primary">
                      {lock.name || `Lock #${i + 1}`}
                    </span>
                    <BlinBadge variant={status === "Locked" ? "locked" : "success"} showDot>
                      {status}
                    </BlinBadge>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <TokenIcon symbol={assetSymbol} size={28} />
                      <div>
                        <div className="font-display font-semibold text-[22px] leading-none mb-1">
                          {amountFmt}{" "}
                          <span className="text-[14px] text-text-muted">{assetSymbol}</span>
                        </div>
                        <div className="inline-flex items-center px-2 py-0.5 bg-brand-green/10 text-brand-green text-[11px] font-bold rounded-full">
                          +{parseFloat(formatUnits(lock.blinReward, 18)).toFixed(2)} $BLIN est.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[12px] text-text-muted mb-4 bg-surface-raised p-2 rounded-lg">
                    <div className="flex items-center gap-1">
                      {status === "Locked"
                        ? <Lock size={14} />
                        : <CheckCircle2 size={14} className="text-brand-green" />}
                      <span className={status === "Ready" ? "text-brand-green font-semibold" : ""}>
                        {status === "Locked" ? `${lock.daysRemaining} days remaining` : "Ready to withdraw"}
                      </span>
                    </div>
                    <span>Unlocks {lock.maturityDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setSelectedLock(lock); setTopUpAmount(""); setIsTopUpOpen(true); }}
                        className="px-3 py-1.5 rounded-full border border-border-medium text-[12px] font-semibold hover:bg-surface-raised transition-colors"
                      >
                        Top Up
                      </button>
                      <button
                        onClick={() => { setSelectedLock(lock); setEditName(lock.name); setIsEditOpen(true); }}
                        className="px-3 py-1.5 rounded-full border border-border-medium text-[12px] font-semibold hover:bg-surface-raised transition-colors"
                      >
                        Edit
                      </button>
                    </div>
                    {status === "Ready" ? (
                      <BlinButton
                        size="sm" className="h-8 px-4 text-[12px]"
                        onClick={() => { setSelectedLock(lock); setIsWithdrawOpen(true); }}
                      >
                        Withdraw
                      </BlinButton>
                    ) : (
                      <button
                        onClick={() => { setSelectedLock(lock); setIsBreakOpen(true); }}
                        className="text-[12px] font-semibold text-brand-red hover:underline"
                      >
                        Break Lock
                      </button>
                    )}
                  </div>
                </BlinCard>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Create Lock FAB (mobile) */}
      {vaultEnabled && (
        <div className="fixed bottom-[80px] left-4 right-4 md:hidden z-20">
          <BlinButton variant="gold" className="w-full shadow-lg" onClick={openNewLock}>
            <Lock size={18} className="mr-2" /> Create a New Lock
          </BlinButton>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          BOTTOM SHEETS
          ══════════════════════════════════════════════════════════════════ */}

      {/* ── Withdraw ────────────────────────────────────────────────────── */}
      <BottomSheet
        isOpen={isWithdrawOpen}
        onClose={() => { if (!mutations.withdraw.isPending) setIsWithdrawOpen(false); }}
        className="h-auto pb-8"
      >
        <div className="flex flex-col">
          <div className="w-16 h-16 rounded-full bg-brand-green/10 flex items-center justify-center text-brand-green mx-auto mb-6">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="font-display font-semibold text-[24px] text-center mb-2">Ready to withdraw!</h2>
          <p className="text-text-secondary text-center mb-8 px-4">
            Your lock &quot;<span className="font-bold text-text-primary">{selectedLock?.name}</span>&quot; has matured. Withdraw your funds.
          </p>
          <div className="bg-surface-raised rounded-2xl p-6 mb-8 border border-border-light">
            <div className="flex flex-col items-center gap-1 mb-4">
              <div className="text-[12px] text-text-secondary uppercase font-bold tracking-widest">Total to receive</div>
              <div className="flex items-baseline gap-2">
                <span className="font-display font-bold text-[36px] text-text-primary">
                  {selectedLock ? formatAmount(selectedLock.principal, assetDecimals) : "0.00"}
                </span>
                <span className="text-[16px] font-bold text-text-muted">{assetSymbol}</span>
              </div>
            </div>
            <div className="space-y-2 pt-4 border-t border-border-medium text-[14px]">
              <div className="flex justify-between">
                <span className="text-text-secondary">Principal</span>
                <span className="font-semibold">
                  {selectedLock ? formatAmount(selectedLock.principal, assetDecimals) : "—"} {assetSymbol}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">$BLIN Yield</span>
                <span className="font-semibold text-brand-green">
                  +{selectedLock
                    ? parseFloat(formatUnits(selectedLock.blinReward, 18)).toFixed(2)
                    : "0.00"} $BLIN
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <BlinButton
              variant="gold" className="w-full h-14 rounded-2xl text-[16px] font-bold"
              onClick={handleConfirmWithdraw}
              isLoading={mutations.withdraw.isPending}
            >
              {mutations.withdraw.isPending
                ? <><Loader2 size={18} className="mr-2 animate-spin" /> Confirming…</>
                : "Withdraw to Main Wallet"}
            </BlinButton>
            <button
              disabled={mutations.withdraw.isPending}
              onClick={() => setIsWithdrawOpen(false)}
              className="w-full h-10 text-[14px] font-semibold text-text-muted hover:text-text-primary disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* ── Top Up ──────────────────────────────────────────────────────── */}
      <BottomSheet isOpen={isTopUpOpen} onClose={() => setIsTopUpOpen(false)} className="h-auto pb-8">
        <div className="flex flex-col">
          <div className="w-16 h-16 rounded-full bg-brand-blue/10 flex items-center justify-center text-brand-blue mx-auto mb-6">
            <Plus size={32} />
          </div>
          <h2 className="font-display font-semibold text-[24px] text-center mb-2">Top Up Lock</h2>
          <p className="text-text-secondary text-center mb-6 px-4">
            Add more {assetSymbol} to &quot;<span className="font-bold text-text-primary">{selectedLock?.name}</span>&quot;
          </p>
          <div className="bg-surface-raised rounded-2xl p-6 mb-6 border border-border-light text-center">
            <input
              type="text" placeholder="0.00"
              value={topUpAmount}
              onChange={(e) => setTopUpAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              className="w-full text-center font-display font-semibold text-[48px] outline-none bg-transparent text-text-primary placeholder:text-text-muted"
            />
            <div className="text-[14px] text-text-muted font-bold">{assetSymbol}</div>
          </div>
          <BlinButton
            variant="gold" className="w-full h-14 rounded-2xl text-[16px] font-bold"
            onClick={handleConfirmTopUp}
            isLoading={mutations.topUp.isPending}
            disabled={!topUpAmount || parseFloat(topUpAmount) <= 0}
          >
            Confirm Top Up
          </BlinButton>
        </div>
      </BottomSheet>

      {/* ── Edit Name ───────────────────────────────────────────────────── */}
      <BottomSheet isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} className="h-auto pb-8">
        <div className="flex flex-col">
          <div className="w-16 h-16 rounded-full bg-brand-gold/10 flex items-center justify-center text-brand-gold mx-auto mb-6">
            <Settings size={32} />
          </div>
          <h2 className="font-display font-semibold text-[24px] text-center mb-8">Rename Lock</h2>
          <div className="mb-8">
            <label className="text-[12px] font-bold text-text-secondary uppercase tracking-wider ml-1 block mb-2">
              Lock Name
            </label>
            <input
              type="text" value={editName}
              onChange={(e) => setEditName(e.target.value.slice(0, 31))}
              className="w-full h-14 bg-surface-raised rounded-xl px-4 font-semibold text-[16px] outline-none border border-border-light focus:border-brand-accent transition-colors"
              placeholder="e.g. School Fees"
            />
            <div className="text-right text-[11px] text-text-muted mt-1">{editName.length}/31</div>
          </div>
          <BlinButton
            variant="gold" className="w-full h-14 rounded-2xl text-[16px] font-bold"
            onClick={handleConfirmEdit}
            isLoading={mutations.renameLock.isPending}
            disabled={!editName}
          >
            Save Changes
          </BlinButton>
        </div>
      </BottomSheet>

      {/* ── Break Lock ──────────────────────────────────────────────────── */}
      <BottomSheet isOpen={isBreakOpen} onClose={() => setIsBreakOpen(false)} className="h-auto pb-8">
        <div className="flex flex-col">
          <div className="w-16 h-16 rounded-full bg-brand-red/10 flex items-center justify-center text-brand-red mx-auto mb-6">
            <Lock size={32} />
          </div>
          <h2 className="font-display font-semibold text-[24px] text-center mb-2 text-brand-red">Break Lock Early?</h2>
          <p className="text-text-secondary text-center mb-8 px-4">
            Breaking a lock early incurs a <span className="font-black text-brand-red">15% penalty fee</span> on your principal.
          </p>
          <div className="bg-brand-red/[0.03] rounded-2xl p-6 mb-8 border border-brand-red/10 space-y-3">
            <div className="flex justify-between text-[14px]">
              <span className="text-text-secondary">Principal</span>
              <span className="font-semibold">
                {selectedLock ? formatAmount(selectedLock.principal, assetDecimals) : "—"} {assetSymbol}
              </span>
            </div>
            <div className="flex justify-between text-[14px]">
              <span className="text-text-secondary">Penalty (15%)</span>
              <span className="font-bold text-brand-red">
                -{selectedLock
                  ? (parseFloat(formatUnits(selectedLock.principal, assetDecimals)) * 0.15).toFixed(2)
                  : "0"} {assetSymbol}
              </span>
            </div>
            <div className="border-t border-brand-red/10 pt-3 flex justify-between items-center">
              <span className="font-bold text-text-primary">You receive</span>
              <span className="font-black text-[20px] text-brand-blue">
                {selectedLock
                  ? (parseFloat(formatUnits(selectedLock.principal, assetDecimals)) * 0.85).toFixed(2)
                  : "0"} {assetSymbol}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <BlinButton
              className="w-full h-14 rounded-2xl text-[16px] font-bold bg-brand-red hover:bg-red-600 border-none"
              onClick={handleConfirmBreak}
              isLoading={mutations.breakLock.isPending}
            >
              Break Lock &amp; Pay Penalty
            </BlinButton>
            <button
              onClick={() => setIsBreakOpen(false)}
              className="w-full h-10 text-[14px] font-semibold text-text-muted hover:text-text-primary"
            >
              Keep Lock &amp; Earn Yield
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* ── Create Lock (3-step wizard) ──────────────────────────────────── */}
      <BottomSheet
        isOpen={isCreateOpen}
        onClose={() => { setIsCreateOpen(false); setCreateStep(0); }}
        steps={3}
        currentStep={createStep}
        className="h-[85vh]"
      >
        <AnimatePresence mode="wait">

          {/* Step 0 — Goal name + amount */}
          {createStep === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="flex flex-col h-full"
            >
              <h2 className="font-display font-semibold text-[24px] mb-6">What are you saving for?</h2>

              <div className="mb-5">
                <label className="text-[12px] font-bold text-text-secondary uppercase tracking-wider block mb-2">Goal Name</label>
                <input
                  type="text" placeholder="e.g. School Fees, Holiday"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value.slice(0, 31))}
                  className="w-full h-14 bg-surface-raised rounded-xl px-4 font-semibold text-[16px] outline-none border border-border-light focus:border-brand-accent transition-colors"
                />
                <div className="text-right text-[12px] text-text-muted mt-1">{createName.length}/31</div>
              </div>

              <div className="mb-6">
                <label className="text-[12px] font-bold text-text-secondary uppercase tracking-wider block mb-2">
                  Amount ({assetSymbol})
                </label>
                <div className="flex items-center gap-2 bg-surface-raised border border-border-light rounded-xl px-4">
                  <TokenIcon symbol={assetSymbol} size={28} />
                  <input
                    type="text" placeholder="0.00"
                    value={createAmount}
                    onChange={(e) => setCreateAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                    className="flex-1 font-display font-semibold text-[32px] py-4 outline-none bg-transparent text-text-primary placeholder:text-text-muted"
                  />
                  <span className="text-[14px] font-bold text-text-muted">{assetSymbol}</span>
                </div>
              </div>

              <div className="mt-auto">
                <BlinButton
                  variant="gold" className="w-full"
                  onClick={() => setCreateStep(1)}
                  disabled={!createName || !createAmount || parseFloat(createAmount) <= 0}
                >
                  Next &rarr;
                </BlinButton>
              </div>
            </motion.div>
          )}

          {/* Step 1 — Duration */}
          {createStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="flex flex-col h-full"
            >
              <h2 className="font-display font-semibold text-[24px] mb-6">Choose your lock duration</h2>

              <div className="grid grid-cols-2 gap-3 mb-8">
                {DURATIONS.map((d, idx) => (
                  <button
                    key={d.label}
                    onClick={() => setSelectedDurIdx(idx)}
                    className={`py-4 rounded-xl border-2 font-semibold text-[15px] transition-all ${
                      selectedDurIdx === idx
                        ? "border-brand-gold bg-brand-gold/10 text-[#A67C00]"
                        : "border-border-light bg-white text-text-secondary hover:border-brand-gold/50"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>

              <div className="text-center mb-8 p-4 bg-surface-raised rounded-2xl">
                <div className="text-[13px] text-text-muted mb-1">Unlocks on</div>
                <div className="font-display font-semibold text-[24px] text-brand-blue">{unlockDate}</div>
                <div className="text-[12px] text-text-muted mt-1">Est. yield: ~{estYield.toFixed(2)} {assetSymbol} at {ESTIMATED_APY}% APY</div>
              </div>

              <div className="mt-auto flex gap-3">
                <BlinButton variant="ghost" className="flex-1" onClick={() => setCreateStep(0)}>&larr; Back</BlinButton>
                <BlinButton variant="gold" className="flex-[2]" onClick={() => setCreateStep(2)}>Review &rarr;</BlinButton>
              </div>
            </motion.div>
          )}

          {/* Step 2 — Review */}
          {createStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="flex flex-col h-full"
            >
              <h2 className="font-display font-semibold text-[24px] mb-6">Review &amp; Lock</h2>

              <div className="bg-surface-raised border border-border-light rounded-2xl p-5 mb-6 space-y-3">
                <div className="flex justify-between text-[14px]">
                  <span className="text-text-secondary">Goal</span>
                  <span className="font-semibold">{createName}</span>
                </div>
                <div className="flex justify-between text-[14px]">
                  <span className="text-text-secondary">Token</span>
                  <span className="font-semibold flex items-center gap-1.5">
                    <TokenIcon symbol={assetSymbol} size={18} />{assetSymbol}
                  </span>
                </div>
                <div className="flex justify-between text-[14px]">
                  <span className="text-text-secondary">Amount</span>
                  <span className="font-semibold">{parseFloat(createAmount || "0").toFixed(2)} {assetSymbol}</span>
                </div>
                <div className="flex justify-between text-[14px]">
                  <span className="text-text-secondary">Lock Until</span>
                  <span className="font-semibold">{unlockDate}</span>
                </div>
                <div className="flex justify-between text-[14px]">
                  <span className="text-text-secondary">Duration</span>
                  <span className="font-semibold">{selectedDuration.label}</span>
                </div>
                <div className="flex justify-between text-[14px]">
                  <span className="text-text-secondary">Est. Yield</span>
                  <span className="font-semibold text-brand-green">
                    ~{estYield.toFixed(2)} {assetSymbol} at {ESTIMATED_APY}% APY
                  </span>
                </div>
                <div className="border-t-2 border-dashed border-border-medium pt-3 flex justify-between text-[16px]">
                  <span className="font-bold">You receive at unlock</span>
                  <span className="font-bold text-brand-green">
                    ~{(parseFloat(createAmount || "0") + estYield).toFixed(2)} {assetSymbol}
                  </span>
                </div>
              </div>

              <label className="flex items-start gap-3 mb-6 cursor-pointer">
                <div className="w-6 h-6 rounded border-2 border-border-medium flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 size={14} className="text-brand-gold" />
                </div>
                <span className="text-[13px] text-text-secondary leading-snug">
                  I understand my funds are locked until {unlockDate} and cannot be withdrawn early without a 15% penalty.
                </span>
              </label>

              <div className="mt-auto flex gap-3">
                <BlinButton variant="ghost" className="flex-1" onClick={() => setCreateStep(1)}>&larr; Back</BlinButton>
                <BlinButton
                  variant="gold" className="flex-[2]"
                  onClick={handleCreateLock}
                  isLoading={mutations.createLock.isPending}
                >
                  {mutations.createLock.isPending
                    ? <><Loader2 size={16} className="mr-2 animate-spin" /> Confirming…</>
                    : <><Lock size={16} className="mr-2" /> Confirm &amp; Lock</>}
                </BlinButton>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </BottomSheet>
    </div>
  );
}
