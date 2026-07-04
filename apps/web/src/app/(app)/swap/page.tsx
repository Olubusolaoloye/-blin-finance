"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowDownUp, Settings, Info, ChevronDown, PiggyBank,
  CheckCircle2, Search, Loader2, RefreshCw, Plus, X, AlertCircle,
} from "lucide-react";
import { useChainId } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { BlinButton } from "@/components/ui/BlinButton";
import { BlinCard } from "@/components/ui/BlinCard";
import { TokenIcon } from "@/components/ui/TokenIcon";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useNotifications } from "@/components/notifications/NotificationContext";
import { useSwapQuote } from "@/hooks/useSwapQuote";
import { useBlinClient } from "@/hooks/useBlinClient";
import { executeSwapWithSave } from "@blin/sdk";
import { useBalances } from "@/hooks/useBalances";
import { useNativeBalance } from "@/hooks/useNativeBalance";
import { useTokenPrices } from "@/hooks/useTokenPrices";
import { useTokenSearch } from "@/hooks/useTokenSearch";
import { useCustomTokens } from "@/hooks/useCustomTokens";
import { useAutoSaveConfig } from "@/hooks/useAutoSaveConfig";
import { useAuth } from "@/hooks/useAuth";
import {
  TOKENS_BY_CHAIN,
  POPULAR_SYMBOLS,
  NATIVE_ADDRESS,
  defaultFromToken,
  defaultToToken,
  type Token,
} from "@/lib/tokens";
import { isKnownChainId } from "@/lib/chains";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(raw: string | number, maxDecimals = 6): string {
  const n = typeof raw === "string" ? parseFloat(raw) : raw;
  if (!raw || isNaN(n)) return "";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
    useGrouping: false,
  });
}

function usd(amount: string | number, price: number): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(n) || price === 0) return "";
  return `$${(n * price).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const NATIVE_SYMBOL: Record<number, string> = { 1: "ETH", 56: "BNB", 42161: "ETH" };

function shortenAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SwapPage() {
  const { addNotification }  = useNotifications();
  const wagmiChainId         = useChainId();
  const { address }          = useAuth();
  const client               = useBlinClient();

  const chainId = isKnownChainId(wagmiChainId) ? wagmiChainId : 1;

  // ── Tokens ───────────────────────────────────────────────────────────────

  const { customTokens, addToken, removeToken, hasToken } = useCustomTokens(chainId);
  const builtInTokens = TOKENS_BY_CHAIN[chainId] ?? [];
  const allTokens     = useMemo(() => [...builtInTokens, ...customTokens], [builtInTokens, customTokens]);

  const [fromToken, setFromToken] = useState<Token>(() => defaultFromToken(chainId));
  const [toToken,   setToToken]   = useState<Token>(() => defaultToToken(chainId));
  const [pickerTarget, setPickerTarget] = useState<"from" | "to">("from");
  const [tokenSearch,  setTokenSearch]  = useState("");

  // ── Amounts ───────────────────────────────────────────────────────────────

  const [fromAmount, setFromAmount] = useState("");

  // ── Quote ─────────────────────────────────────────────────────────────────

  const [slippage,    setSlippage]    = useState("0.5");
  const [showDetails, setShowDetails] = useState(false);

  const slippageBps = Math.round(parseFloat(slippage || "0.5") * 100);

  const {
    quote, toAmount, toAmountMin,
    isLoading: quoteLoading, isFetching: quoteFetching,
    isError: quoteError, provider,
  } = useSwapQuote({ fromToken, toToken, fromAmount, slippageBps });

  // ── Live Balances ─────────────────────────────────────────────────────────

  const { allTokens: liveErc20 } = useBalances([chainId]);
  const { balance: nativeBalance, balanceEther } = useNativeBalance();

  const nativeSymbol = NATIVE_SYMBOL[chainId] ?? "ETH";

  const getLiveBalance = useCallback(
    (token: Token): string => {
      // Native token
      if (token.address === NATIVE_ADDRESS || token.isNative) {
        if (balanceEther === 0) return "0";
        return fmt(balanceEther, 4);
      }
      // ERC-20
      const t = liveErc20.find(
        (lt) => lt.address.toLowerCase() === token.address.toLowerCase(),
      );
      if (!t) return "0";
      return fmt(formatUnits(t.balance, t.decimals), token.decimals <= 6 ? 2 : 4);
    },
    [liveErc20, balanceEther],
  );

  // ── Live Prices ───────────────────────────────────────────────────────────

  // Price symbols: current from/to + popular + any custom tokens
  const popularTokens = useMemo(
    () => (POPULAR_SYMBOLS[chainId] ?? [])
      .map((sym) => builtInTokens.find((t) => t.symbol === sym))
      .filter((t): t is Token => !!t),
    [chainId, builtInTokens],
  );

  const priceSymbols = useMemo(() => {
    const set = new Set([
      fromToken.symbol,
      toToken.symbol,
      nativeSymbol,
      ...popularTokens.map((t) => t.symbol),
      ...customTokens.map((t) => t.symbol),
    ]);
    return [...set];
  }, [fromToken, toToken, nativeSymbol, popularTokens, customTokens]);

  const { getPrice, isLoading: priceLoading } = useTokenPrices(priceSymbols);

  const fromPriceUsd = getPrice(fromToken.symbol);
  const toPriceUsd   = getPrice(toToken.symbol);

  // ── Contract Address Search ───────────────────────────────────────────────

  const { resolvedToken, isSearching, searchError, isAddressQuery } =
    useTokenSearch(tokenSearch);

  // ── UI State ──────────────────────────────────────────────────────────────

  // ── AutoSave — persisted in Zustand (shared with Vault page) ─────────────
  const {
    autoSaveEnabled:     autoSave,
    savePercent:         savePercentage,
    setAutoSave:         setAutoSave,
    setSavePercent:      setSavePercentage,
    contractsEnabled:    autoSaveContractsEnabled,
    lockDurationSeconds,
  } = useAutoSaveConfig();

  const [swapState,      setSwapState]      = useState<"idle" | "loading" | "success">("idle");
  const [isPickerOpen,   setIsPickerOpen]   = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // ── Filtered token list for the picker ───────────────────────────────────

  const filteredTokens = useMemo(() => {
    if (isAddressQuery) return []; // address query handled separately
    const q = tokenSearch.toLowerCase().trim();
    if (!q) return allTokens;
    return allTokens.filter(
      (t) =>
        t.symbol.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.address.toLowerCase().includes(q),
    );
  }, [allTokens, tokenSearch, isAddressQuery]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const openPicker = (target: "from" | "to") => {
    setPickerTarget(target);
    setTokenSearch("");
    setIsPickerOpen(true);
  };

  const selectToken = (token: Token) => {
    if (pickerTarget === "from") {
      if (token.address === toToken.address) setToToken(fromToken);
      setFromToken(token);
    } else {
      if (token.address === fromToken.address) setFromToken(toToken);
      setToToken(token);
    }
    setIsPickerOpen(false);
    setFromAmount("");
  };

  const handleAddCustomToken = (token: Token) => {
    addToken(token);
    selectToken(token);
  };

  const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "" || /^\d*\.?\d*$/.test(val)) setFromAmount(val);
  };

  const handleMax = () => {
    const bal = getLiveBalance(fromToken);
    if (bal && bal !== "0") {
      // Leave a tiny buffer for gas on native tokens
      const n = parseFloat(bal.replace(/,/g, ""));
      const adjusted = fromToken.isNative ? Math.max(0, n - 0.001) : n;
      setFromAmount(adjusted > 0 ? adjusted.toString() : "");
    }
  };

  const switchTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount(toAmount ?? "");
  };

  const providerLabel = provider
    ? ({
        "pancakeswap-v2": "PancakeSwap V2",
        "uniswap-v3":     "Uniswap V3",
        "mock":           "Mock DEX",
      } as Record<string, string>)[provider] ?? provider
    : null;

  const handleSwap = useCallback(async () => {
    if (!quote || !address) return;
    setSwapState("loading");
    try {
      if (autoSaveContractsEnabled && client?.walletClient) {
        // ── Real on-chain swap via SaveSwap contract ────────────────────────
        const amountIn = parseUnits(fromAmount, fromToken.decimals);
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 300); // 5 min

        const swapResult = await executeSwapWithSave(client, {
          quote,
          saveBps:      autoSave ? savePercentage * 100 : 0,
          deadline,
          tokenIn:      fromToken.address,
          tokenOut:     toToken.address,
          amountIn,
          lockDuration: lockDurationSeconds,
        });

        if (swapResult.isErr()) throw swapResult.error;
        const { lockId } = swapResult.value;

        setSwapState("success");
        addNotification({
          title:   "Swap Successful!",
          message: `Swapped ${fromAmount} ${fromToken.symbol} → ${fmt(toAmount, 4)} ${toToken.symbol}.`,
          type:    "success",
        });

        // Show AutoSave notification only when a lock was actually created
        // (lockId === type(uint256).max means saveBps=0 or saveAmount rounded to 0)
        const noLock = lockId === (2n ** 256n - 1n);
        if (autoSave && !noLock) {
          const savedAmt = parseFloat(toAmount ?? "0") * (savePercentage / 100);
          addNotification({
            title:   "AutoSave Vault",
            message: `${fmt(savedAmt, 4)} ${toToken.symbol} auto-saved → Lock #${lockId}.`,
            type:    "success",
          });
        }
      } else {
        // ── Simulation fallback (contracts not yet deployed on this chain) ──
        await new Promise<void>((res) => setTimeout(res, 2000));
        setSwapState("success");
        addNotification({
          title:   "Swap Successful!",
          message: `Swapped ${fromAmount} ${fromToken.symbol} → ${fmt(toAmount, 4)} ${toToken.symbol} via ${providerLabel ?? "aggregator"}.`,
          type:    "success",
        });
        if (autoSave) {
          const saved = parseFloat(toAmount ?? "0") * (savePercentage / 100);
          addNotification({
            title:   "AutoSave Vault",
            message: `${fmt(saved, 4)} ${toToken.symbol} auto-saved.`,
            type:    "success",
          });
        }
      }
      setTimeout(() => { setSwapState("idle"); setFromAmount(""); }, 3000);
    } catch (err: unknown) {
      setSwapState("idle");
      addNotification({
        title:   "Swap Failed",
        message: err instanceof Error ? err.message : "Transaction rejected.",
        type:    "alert",
      });
    }
  }, [
    quote, fromAmount, toAmount, fromToken, toToken,
    address, client, autoSave, autoSaveContractsEnabled,
    savePercentage, lockDurationSeconds, providerLabel, addNotification,
  ]);

  // ── Derived display ───────────────────────────────────────────────────────

  const fromBalance  = getLiveBalance(fromToken);
  const toBalance    = getLiveBalance(toToken);

  const rateLabel = (() => {
    if (!toAmount || !fromAmount) return null;
    const rate = parseFloat(toAmount) / parseFloat(fromAmount);
    if (isNaN(rate) || rate === 0) return null;
    return `1 ${fromToken.symbol} ≈ ${fmt(rate, 4)} ${toToken.symbol}`;
  })();

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-center max-w-[480px] mx-auto w-full pb-10">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="w-full flex justify-between items-center mb-6 px-1">
        <h1 className="font-display font-semibold text-[24px] tracking-tight text-brand-navy">Swap</h1>
        <div className="relative">
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`p-2.5 rounded-full transition-all ${isSettingsOpen ? "bg-brand-blue text-white shadow-lg" : "text-text-secondary hover:bg-surface-raised border border-transparent hover:border-border-light"}`}
          >
            <Settings size={20} />
          </button>

          <AnimatePresence>
            {isSettingsOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="absolute right-0 mt-3 w-[240px] bg-white rounded-2xl shadow-2xl border border-border-light overflow-hidden z-[100]"
              >
                <div className="p-4 border-b border-border-light bg-surface-raised/50">
                  <h3 className="font-bold text-[14px]">Settings</h3>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-1.5 mb-3">
                    <span className="text-[12px] font-semibold text-text-secondary uppercase tracking-wider">Slippage Tolerance</span>
                    <Info size={12} className="text-text-muted" />
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 p-1 bg-surface-raised rounded-xl mb-4">
                    {["0.1", "0.5", "1.0"].map((val) => (
                      <button
                        key={val}
                        onClick={() => setSlippage(val)}
                        className={`py-1.5 rounded-lg text-[11px] font-bold transition-all ${slippage === val ? "bg-white text-brand-blue shadow-sm" : "text-text-muted hover:text-text-primary"}`}
                      >
                        {val}%
                      </button>
                    ))}
                    <input
                      type="text"
                      placeholder="Custom"
                      value={["0.1", "0.5", "1.0"].includes(slippage) ? "" : slippage}
                      onChange={(e) => setSlippage(e.target.value.replace("%", ""))}
                      className="w-full bg-transparent text-center text-[11px] font-bold outline-none placeholder:text-text-muted"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-3 mb-4 border-t border-border-light">
                    <div className="flex items-center gap-2">
                      <PiggyBank size={14} className="text-brand-gold" />
                      <span className="text-[12px] font-bold">AutoSave Vault</span>
                    </div>
                    <button
                      onClick={() => setAutoSave(!autoSave)}
                      className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-300 ${autoSave ? "bg-brand-gold" : "bg-border-medium"}`}
                    >
                      <motion.div animate={{ x: autoSave ? 20 : 0 }} className="w-4 h-4 bg-white rounded-full shadow-sm" />
                    </button>
                  </div>

                  <AnimatePresence>
                    {autoSave && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="flex flex-col gap-2 pb-2">
                          <div className="flex justify-between items-center text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                            <span>Save Amount</span>
                            <span className="text-brand-gold">{savePercentage}%</span>
                          </div>
                          <input
                            type="range" min="1" max="50" step="1"
                            value={savePercentage}
                            onChange={(e) => setSavePercentage(parseInt(e.target.value))}
                            className="w-full h-1.5 bg-surface-raised rounded-lg appearance-none cursor-pointer accent-brand-gold"
                          />
                          <div className="flex justify-between text-[10px] text-text-muted font-medium">
                            <span>1%</span><span>50%</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Chain badge ────────────────────────────────────────────────────── */}
      <div className="flex p-1.5 bg-white/80 backdrop-blur-sm rounded-2xl border border-border-light mb-8 shadow-sm self-start">
        {([
          { id: 1,      label: "Ethereum",  bg: "#627EEA", text: "E",  dark: false },
          { id: 56,     label: "BSC",       bg: "#F3BA2F", text: "B",  dark: true  },
          { id: 421614, label: "Arb Sepolia", bg: "#12AAFF", text: "A", dark: false },
        ] as const).map(({ id, label, bg, text, dark }) => (
          <div
            key={id}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold transition-all ${
              chainId === id ? "bg-brand-navy text-white shadow-md" : "text-text-secondary opacity-40"
            }`}
          >
            <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: bg }}>
              <span className={`text-[10px] font-black ${dark ? "text-brand-navy" : "text-white"}`}>{text}</span>
            </div>
            {label}
          </div>
        ))}
      </div>

      {/* ── Main Swap Card ─────────────────────────────────────────────────── */}
      <div className="w-full relative group">
        <div className="absolute -inset-1 bg-gradient-to-b from-brand-blue/5 to-transparent rounded-[32px] blur-xl opacity-50 group-hover:opacity-100 transition-opacity" />
        <BlinCard className="relative w-full p-2.5 rounded-[30px] border-none shadow-2xl bg-white/90 backdrop-blur-md overflow-visible">

          {/* FROM */}
          <div className="bg-surface-raised/80 rounded-[22px] p-5 mb-1.5 border border-transparent focus-within:border-brand-blue/20 transition-all hover:bg-surface-raised">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.1em]">Pay with</span>
              <div className="flex items-center gap-2">
                {priceLoading ? (
                  <div className="h-3 w-20 bg-border-light rounded animate-pulse" />
                ) : (
                  <span className="text-[11px] font-bold text-text-muted">
                    Balance: {fromBalance}
                  </span>
                )}
                {parseFloat(fromBalance) > 0 && (
                  <button
                    onClick={handleMax}
                    className="px-2 py-0.5 bg-brand-blue/10 text-brand-blue text-[10px] font-bold rounded-lg hover:bg-brand-blue hover:text-white transition-all uppercase tracking-wider"
                  >
                    Max
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={() => openPicker("from")}
                className="flex items-center gap-2.5 bg-white hover:shadow-md border border-border-light rounded-2xl py-2 pl-2 pr-4 shadow-sm transition-all shrink-0 active:scale-95"
              >
                <TokenIcon symbol={fromToken.symbol} size={32} />
                <span className="font-bold text-[18px] text-brand-navy tracking-tight">{fromToken.symbol}</span>
                <ChevronDown size={18} className="text-text-muted" />
              </button>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={fromAmount}
                onChange={handleFromChange}
                className="bg-transparent text-right font-display font-medium text-[42px] w-full outline-none text-brand-navy placeholder:text-border-medium tracking-tight"
              />
            </div>
            <div className="flex justify-end mt-2">
              <span className="text-[13px] text-text-muted font-medium font-mono">
                {fromAmount && fromPriceUsd > 0 ? usd(fromAmount, fromPriceUsd) : "$0.00"}
              </span>
            </div>
          </div>

          {/* Arrow */}
          <div className="relative h-4 flex justify-center items-center z-20">
            <motion.button
              whileHover={{ rotate: 180, scale: 1.1 }}
              whileTap={{ scale: 0.9, rotate: 360 }}
              onClick={switchTokens}
              className="w-11 h-11 bg-white border-[3px] border-surface-bg rounded-2xl flex items-center justify-center shadow-xl text-brand-blue hover:text-brand-accent transition-all ring-1 ring-border-light"
            >
              <ArrowDownUp size={20} strokeWidth={2.5} />
            </motion.button>
          </div>

          {/* TO */}
          <div className="bg-brand-green/[0.03] rounded-[22px] p-5 mt-1.5 border border-brand-green/10 transition-all">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.1em]">Receive</span>
              <span className="text-[11px] font-bold text-text-muted">Balance: {toBalance}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={() => openPicker("to")}
                className="flex items-center gap-2.5 bg-white hover:shadow-md border border-border-light rounded-2xl py-2 pl-2 pr-4 shadow-sm transition-all shrink-0 active:scale-95"
              >
                <TokenIcon symbol={toToken.symbol} size={32} />
                <span className="font-bold text-[18px] text-brand-navy tracking-tight">{toToken.symbol}</span>
                <ChevronDown size={18} className="text-text-muted" />
              </button>
              <div className="flex-1 flex items-center justify-end gap-2">
                {quoteLoading && fromAmount ? (
                  <Loader2 size={28} className="text-brand-blue animate-spin" />
                ) : (
                  <span className={`font-display font-medium text-[42px] tracking-tight ${toAmount ? "text-brand-green" : "text-border-medium"}`}>
                    {toAmount ? fmt(toAmount, 4) : "0"}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-1.5">
                {providerLabel && (
                  <span className="text-[11px] text-text-muted font-bold px-2 py-0.5 bg-surface-raised rounded-full">
                    via {providerLabel}
                  </span>
                )}
                {quoteError && fromAmount && (
                  <span className="text-[11px] text-brand-red font-semibold">No route found</span>
                )}
              </div>
              <span className="text-[13px] text-text-muted font-medium font-mono">
                {toAmount && toPriceUsd > 0 ? usd(toAmount, toPriceUsd) : "$0.00"}
              </span>
            </div>
          </div>

          {/* Rate / details row */}
          <div className="px-5 py-4 flex flex-col gap-2.5">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                {quoteFetching && !quoteLoading && (
                  <RefreshCw size={12} className="text-text-muted animate-spin" />
                )}
                <span className="text-[12px] text-text-muted font-medium">
                  {rateLabel ?? (fromAmount ? "Fetching rate…" : "Enter an amount")}
                </span>
              </div>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="flex items-center gap-1"
              >
                <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Slippage</span>
                <span className="text-[12px] font-bold text-brand-blue">{slippage}%</span>
              </button>
            </div>

            {fromAmount && toAmount && (
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center justify-center gap-1.5 w-full py-1 text-[11px] font-bold text-brand-blue/60 hover:text-brand-blue transition-colors"
              >
                {showDetails ? "Hide details" : "Show swap details"}
                <motion.div animate={{ rotate: showDetails ? 180 : 0 }}>
                  <ChevronDown size={14} />
                </motion.div>
              </button>
            )}

            <AnimatePresence>
              {showDetails && fromAmount && toAmount && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="py-2 space-y-2.5 text-[12px]">
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Minimum received</span>
                      <span className="font-bold">{fmt(toAmountMin, 4)} {toToken.symbol}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Price impact</span>
                      <span className={`font-bold ${(quote?.priceImpactBps ?? 0) > 100 ? "text-brand-red" : "text-brand-green"}`}>
                        {quote ? `${((quote.priceImpactBps ?? 0) / 100).toFixed(2)}%` : "< 0.01%"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Route</span>
                      <span className="font-bold">{providerLabel ?? "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Protocol fee</span>
                      <span className="font-bold underline decoration-dotted underline-offset-2">0.05%</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </BlinCard>
      </div>

      <div className="h-6" />

      {/* ── AutoSave ───────────────────────────────────────────────────────── */}
      <motion.div
        layout
        className={`w-full p-5 rounded-[24px] border-2 transition-all duration-300 ${
          autoSave
            ? "bg-brand-gold/[0.03] border-brand-gold/20 shadow-lg shadow-brand-gold/5"
            : "bg-surface-raised/40 border-border-light shadow-sm"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${autoSave ? "bg-brand-gold text-white" : "bg-white shadow-sm text-brand-gold"}`}>
              <PiggyBank size={24} strokeWidth={2.5} />
            </div>
            <div>
              <div className="font-bold text-[16px] text-brand-navy">AutoSave Vault</div>
              <div className="text-[12px] text-text-secondary font-medium italic">Save {savePercentage}% of every swap</div>
            </div>
          </div>
          <button
            onClick={() => setAutoSave(!autoSave)}
            className={`w-14 h-7 rounded-full p-1 transition-all duration-500 ${autoSave ? "bg-brand-gold ring-4 ring-brand-gold/10" : "bg-border-medium"}`}
          >
            <motion.div animate={{ x: autoSave ? 28 : 0 }} className="w-5 h-5 bg-white rounded-full shadow-md" />
          </button>
        </div>

        <AnimatePresence>
          {autoSave && fromAmount && toAmount && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-5 pt-5 border-t border-brand-gold/10 space-y-2.5">
                <div className="flex justify-between items-center text-[13px]">
                  <span className="text-brand-navy/60 font-medium">To be saved ({savePercentage}%)</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-brand-gold font-black">
                      {fmt(parseFloat(toAmount) * savePercentage / 100, 4)}
                    </span>
                    <span className="text-[10px] font-black text-brand-gold/50">{toToken.symbol}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center text-[13px]">
                  <span className="text-brand-navy/60 font-medium">Final receive</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-brand-navy font-black">
                      {fmt(parseFloat(toAmount) * (1 - savePercentage / 100), 4)}
                    </span>
                    <span className="text-[10px] font-black text-brand-navy/40">{toToken.symbol}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <div className="h-8" />

      {/* ── Action Button ──────────────────────────────────────────────────── */}
      <div className="w-full">
        {!fromAmount ? (
          <BlinButton variant="secondary" className="w-full h-[64px] rounded-3xl opacity-40 grayscale cursor-not-allowed" disabled>
            Enter an amount
          </BlinButton>
        ) : quoteLoading ? (
          <BlinButton variant="secondary" className="w-full h-[64px] rounded-3xl" disabled>
            <Loader2 size={20} className="mr-2 animate-spin" /> Getting best rate…
          </BlinButton>
        ) : quoteError || !quote ? (
          <BlinButton variant="secondary" className="w-full h-[64px] rounded-3xl opacity-60 cursor-not-allowed" disabled>
            No route available
          </BlinButton>
        ) : swapState === "loading" ? (
          <BlinButton variant="gold" className="w-full h-[64px] rounded-3xl" isLoading>
            Routing swap…
          </BlinButton>
        ) : swapState === "success" ? (
          <BlinButton className="w-full h-[64px] rounded-3xl bg-brand-green shadow-xl shadow-brand-green/20 ring-4 ring-brand-green/10">
            <CheckCircle2 size={22} className="mr-2" strokeWidth={2.5} /> Swap Confirmed
          </BlinButton>
        ) : !address ? (
          <BlinButton variant="secondary" className="w-full h-[64px] rounded-3xl opacity-60 cursor-not-allowed" disabled>
            Connect wallet to swap
          </BlinButton>
        ) : (
          <BlinButton
            className="w-full h-[64px] rounded-3xl shadow-xl shadow-brand-blue/20 text-[18px] font-black"
            onClick={handleSwap}
          >
            Review Swap
          </BlinButton>
        )}
      </div>

      <p className="mt-6 text-[11px] text-text-muted text-center max-w-[280px] leading-relaxed">
        By swapping you agree to our <span className="underline decoration-dotted">Terms of Service</span> and acknowledge network risks.
      </p>

      {/* ── Token Picker Sheet ─────────────────────────────────────────────── */}
      <BottomSheet isOpen={isPickerOpen} onClose={() => setIsPickerOpen(false)} className="h-[85vh]">
        <div className="flex flex-col h-full bg-white">
          <div className="w-12 h-1.5 bg-border-light rounded-full mx-auto mb-5" />
          <h2 className="font-display font-semibold text-[22px] mb-5 text-center text-brand-navy tracking-tight">
            {pickerTarget === "from" ? "Select Pay Token" : "Select Receive Token"}
          </h2>

          {/* Search / address input */}
          <div className="relative mb-5">
            {isSearching ? (
              <Loader2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-blue animate-spin" />
            ) : (
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
            )}
            <input
              type="text"
              placeholder="Search name, symbol, or paste contract address"
              value={tokenSearch}
              onChange={(e) => setTokenSearch(e.target.value)}
              className="w-full h-[52px] bg-surface-raised/50 rounded-2xl pl-11 pr-10 outline-none border border-border-light focus:border-brand-blue focus:bg-white transition-all shadow-sm text-[14px]"
            />
            {tokenSearch && (
              <button
                onClick={() => setTokenSearch("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* ── Address resolution result ───────────────────────────────────── */}
          <AnimatePresence>
            {isAddressQuery && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mb-4"
              >
                {isSearching && (
                  <div className="flex items-center gap-3 p-4 bg-brand-blue/5 rounded-2xl border border-brand-blue/10">
                    <Loader2 size={20} className="text-brand-blue animate-spin shrink-0" />
                    <div>
                      <div className="text-[13px] font-semibold text-brand-blue">Fetching token metadata…</div>
                      <div className="text-[11px] text-text-muted font-mono mt-0.5">{shortenAddress(tokenSearch)}</div>
                    </div>
                  </div>
                )}

                {searchError && !isSearching && (
                  <div className="flex items-start gap-3 p-4 bg-brand-red/5 rounded-2xl border border-brand-red/10">
                    <AlertCircle size={20} className="text-brand-red shrink-0 mt-0.5" />
                    <div>
                      <div className="text-[13px] font-semibold text-brand-red">Token not found</div>
                      <div className="text-[12px] text-text-muted mt-0.5">{searchError}</div>
                    </div>
                  </div>
                )}

                {resolvedToken && !isSearching && (
                  <div className="p-4 bg-white rounded-2xl border-2 border-brand-blue/20 shadow-md">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <TokenIcon symbol={resolvedToken.symbol} size={42} />
                        <div>
                          <div className="font-bold text-[16px] text-brand-navy">{resolvedToken.symbol}</div>
                          <div className="text-[12px] text-text-muted">{resolvedToken.name}</div>
                          <div className="text-[11px] font-mono text-text-muted mt-0.5">
                            {shortenAddress(resolvedToken.address)} · {resolvedToken.decimals} decimals
                          </div>
                        </div>
                      </div>
                      {hasToken(resolvedToken.address) ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-brand-green bg-brand-green/10 px-2 py-1 rounded-full">Added</span>
                          <button
                            onClick={() => selectToken(resolvedToken)}
                            className="px-3 py-1.5 bg-brand-blue text-white rounded-xl text-[12px] font-bold hover:bg-brand-accent transition-colors"
                          >
                            Select
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAddCustomToken(resolvedToken)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-brand-blue text-white rounded-xl text-[13px] font-bold hover:bg-brand-accent transition-colors shadow-md shadow-brand-blue/20 active:scale-95"
                        >
                          <Plus size={16} /> Add Token
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Popular pills — only when not doing address search */}
          {!tokenSearch && (
            <>
              <div className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.2em] mb-3 ml-1">Popular</div>
              <div className="flex gap-2 mb-5 overflow-x-auto hide-scrollbar -mx-1 px-1">
                {popularTokens.map((t) => (
                  <button
                    key={t.symbol}
                    onClick={() => selectToken(t)}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-border-light rounded-xl shrink-0 hover:border-brand-blue hover:shadow-md transition-all active:scale-95"
                  >
                    <TokenIcon symbol={t.symbol} size={24} />
                    <span className="text-[14px] font-bold text-brand-navy">{t.symbol}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Custom tokens section */}
          {customTokens.length > 0 && !tokenSearch && (
            <div className="mb-4">
              <div className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.2em] mb-2 ml-1">
                My Custom Tokens
              </div>
              <div className="space-y-1">
                {customTokens.map((t) => {
                  const bal  = getLiveBalance(t);
                  const price = getPrice(t.symbol);
                  return (
                    <div
                      key={t.address}
                      className="flex items-center justify-between p-3 hover:bg-surface-raised rounded-2xl transition-colors group"
                    >
                      <button
                        onClick={() => selectToken(t)}
                        className="flex items-center gap-3 flex-1 min-w-0"
                      >
                        <TokenIcon symbol={t.symbol} size={36} />
                        <div className="text-left min-w-0">
                          <div className="font-bold text-[14px] text-brand-navy group-hover:text-brand-blue">
                            {t.symbol}
                            <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 bg-brand-blue/10 text-brand-blue rounded-full">Custom</span>
                          </div>
                          <div className="text-[11px] text-text-muted truncate">{shortenAddress(t.address)}</div>
                        </div>
                      </button>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <div className="font-bold text-[14px] text-brand-navy">{bal}</div>
                          {bal !== "0" && price > 0 && (
                            <div className="text-[11px] text-text-muted font-mono">{usd(bal, price)}</div>
                          )}
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeToken(t.address); }}
                          className="p-1.5 rounded-lg text-text-muted hover:text-brand-red hover:bg-brand-red/5 transition-colors"
                          title="Remove custom token"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Full token list */}
          {!isAddressQuery && (
            <>
              {filteredTokens.length > 0 && (
                <div className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.2em] mb-2 ml-1">
                  {tokenSearch ? "Results" : "All Tokens"}
                </div>
              )}
              <div className="flex-1 overflow-y-auto -mx-5 px-5 space-y-0.5">
                {filteredTokens.map((t) => {
                  const bal   = getLiveBalance(t);
                  const price = getPrice(t.symbol);
                  const isCustom = customTokens.some(
                    (ct) => ct.address.toLowerCase() === t.address.toLowerCase(),
                  );
                  return (
                    <div
                      key={t.address}
                      onClick={() => selectToken(t)}
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-raised rounded-2xl transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <TokenIcon symbol={t.symbol} size={42} />
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full border border-border-light flex items-center justify-center">
                            <div className={`w-2.5 h-2.5 rounded-full ${parseFloat(bal) > 0 ? "bg-brand-green" : "bg-border-medium"}`} />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[16px] text-brand-navy group-hover:text-brand-blue transition-colors">
                              {t.symbol}
                            </span>
                            {isCustom && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 bg-brand-blue/10 text-brand-blue rounded-full uppercase tracking-wide">
                                Custom
                              </span>
                            )}
                          </div>
                          <div className="text-[13px] text-text-muted font-medium">{t.name}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-[15px] text-brand-navy">
                          {parseFloat(bal) > 0 ? bal : "—"}
                        </div>
                        {parseFloat(bal) > 0 && price > 0 && (
                          <div className="text-[12px] text-text-muted font-mono">{usd(bal, price)}</div>
                        )}
                        {price > 0 && parseFloat(bal) === 0 && (
                          <div className="text-[12px] text-text-muted">{usd(1, price)}/token</div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {filteredTokens.length === 0 && !isAddressQuery && tokenSearch && (
                  <div className="py-12 text-center">
                    <p className="text-text-muted text-[14px] mb-2">No tokens match &quot;{tokenSearch}&quot;</p>
                    <p className="text-text-muted text-[12px]">
                      Paste a contract address (0x…) to import any token
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </BottomSheet>

    </div>
  );
}
