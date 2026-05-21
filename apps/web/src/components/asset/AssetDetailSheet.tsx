"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { formatUnits, parseUnits, isAddress } from "viem";
import type { Address } from "viem";
import {
  useSendTransaction,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import {
  X, Copy, CheckCircle2, Send, History,
  ArrowDownLeft, Loader2, AlertCircle,
} from "lucide-react";
import { TokenIcon }      from "@/components/ui/TokenIcon";
import { AmountDisplay }  from "@/components/ui/AmountDisplay";
import { TransactionRow } from "@/components/ui/TransactionRow";
import { useAuth }        from "@/hooks/useAuth";
import { useAlchemyTransfers } from "@/hooks/useAlchemyTransfers";
import type { PortfolioToken } from "@/hooks/usePortfolio";
import { NATIVE_ADDRESS } from "@/lib/tokens";

/* ─── Minimal ERC-20 ABI ────────────────────────────────────────────────────── */
const ERC20_ABI = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to",     type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

type Tab = "history" | "receive" | "send";

interface Props {
  token:   PortfolioToken | null;
  onClose: () => void;
}

/* ─── History tab ────────────────────────────────────────────────────────────── */
function HistoryPanel({ token }: { token: PortfolioToken }) {
  const { transfers, isLoading } = useAlchemyTransfers(50);

  const assetTxs = useMemo(
    () => transfers.filter(
      (tx) => tx.asset?.toLowerCase() === token.symbol.toLowerCase(),
    ),
    [transfers, token.symbol],
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 pt-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 animate-pulse px-1">
            <div className="w-10 h-10 rounded-full bg-border-light shrink-0" />
            <div className="flex-1 flex flex-col gap-2">
              <div className="h-3 w-32 bg-border-light rounded-full" />
              <div className="h-2.5 w-20 bg-border-light rounded-full" />
            </div>
            <div className="h-3 w-16 bg-border-light rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (assetTxs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-center">
        <div className="w-14 h-14 rounded-full bg-surface-raised flex items-center justify-center mb-3">
          <History size={24} className="text-text-muted" />
        </div>
        <p className="font-semibold text-text-primary mb-1">No transactions yet</p>
        <p className="text-[13px] text-text-muted">
          {token.symbol} transactions will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border-light -mx-5">
      {assetTxs.map((tx) => (
        <TransactionRow
          key={tx.id}
          type={tx.type as "swap" | "save" | "receive" | "send" | "stock"}
          title={tx.title}
          date={tx.date}
          amount={tx.amount}
          usdValue={tx.usdValue}
          isPositive={tx.isPositive}
          className="px-5 rounded-none"
        />
      ))}
    </div>
  );
}

/* ─── Receive tab ────────────────────────────────────────────────────────────── */
function ReceivePanel({ token, address }: { token: PortfolioToken; address: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(address)}&bgcolor=ffffff&color=0D2137&margin=12`;

  return (
    <div className="flex flex-col items-center pt-2 pb-4">
      <p className="text-[13px] text-text-secondary text-center mb-6 max-w-[280px]">
        Share this address to receive{" "}
        <span className="font-semibold text-text-primary">{token.symbol}</span>{" "}
        on this network. Only send {token.symbol} here.
      </p>

      {/* QR */}
      <div className="w-[200px] h-[200px] rounded-2xl overflow-hidden border-4 border-white shadow-lg mb-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrUrl} alt="Wallet QR code" className="w-full h-full" />
      </div>

      {/* Address row */}
      <button
        type="button"
        onClick={copy}
        className="flex items-center gap-3 w-full bg-surface-raised border border-border-light rounded-2xl p-4 hover:bg-surface-raised/80 active:scale-[0.98] transition-all"
      >
        <div className="flex-1 text-left">
          <div className="text-[11px] text-text-muted uppercase tracking-wider font-semibold mb-1">
            Wallet Address
          </div>
          <div className="font-mono text-[12px] text-text-primary break-all leading-relaxed">
            {address}
          </div>
        </div>
        <div className={`shrink-0 transition-colors ${copied ? "text-brand-green" : "text-text-muted"}`}>
          {copied ? <CheckCircle2 size={20} /> : <Copy size={20} />}
        </div>
      </button>

      {copied && (
        <p className="text-[13px] text-brand-green font-semibold mt-3">
          Address copied!
        </p>
      )}
    </div>
  );
}

/* ─── Send tab ───────────────────────────────────────────────────────────────── */
function SendPanel({ token, onClose }: { token: PortfolioToken; onClose: () => void }) {
  const { address } = useAuth();

  const [to,     setTo]     = useState("");
  const [amount, setAmount] = useState("");

  const isNative = token.address === NATIVE_ADDRESS || !!token.isNative;
  const maxHuman = parseFloat(formatUnits(token.balance, token.decimals));

  /* wagmi hooks */
  const {
    sendTransaction,
    data:      nativeHash,
    isPending: nativePending,
    error:     nativeError,
    reset:     nativeReset,
  } = useSendTransaction();

  const {
    writeContract,
    data:      erc20Hash,
    isPending: erc20Pending,
    error:     erc20Error,
    reset:     erc20Reset,
  } = useWriteContract();

  const txHash    = isNative ? nativeHash    : erc20Hash;
  const isPending = isNative ? nativePending : erc20Pending;

  /* Safely extract error message — wagmi error types vary across versions */
  const rawError  = isNative ? nativeError : erc20Error;
  const txErrMsg: string | null = rawError != null
    ? String((rawError as { message?: unknown }).message ?? rawError)
        .split("\n")[0]!
        .split("(")[0]!
        .trim()
    : null;

  const { isLoading: isMining, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const toValid     = isAddress(to);
  const amountNum   = parseFloat(amount || "0");
  const amountValid = amountNum > 0 && amountNum <= maxHuman;
  const canSend     = toValid && amountValid && !isPending && !isMining;

  const handleSend = () => {
    if (!canSend || !address) return;
    const amountWei = parseUnits(amount, token.decimals);
    if (isNative) {
      sendTransaction({ to: to as Address, value: amountWei });
    } else {
      writeContract({
        address:      token.address as Address,
        abi:          ERC20_ABI,
        functionName: "transfer",
        args:         [to as Address, amountWei],
      });
    }
  };

  const handleReset = () => {
    setTo(""); setAmount("");
    if (isNative) nativeReset(); else erc20Reset();
  };

  /* Success screen */
  if (isSuccess) {
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <div className="w-16 h-16 rounded-full bg-brand-green/10 flex items-center justify-center mb-4">
          <CheckCircle2 size={32} className="text-brand-green" />
        </div>
        <h3 className="font-display font-semibold text-[22px] mb-2">Sent!</h3>
        <p className="text-[14px] text-text-secondary mb-1">
          <span className="font-semibold text-text-primary">{amount} {token.symbol}</span> sent to
        </p>
        <p className="font-mono text-[12px] text-text-muted mb-8">
          {to.slice(0, 8)}…{to.slice(-6)}
        </p>
        <button
          type="button"
          onClick={handleReset}
          className="w-full h-12 rounded-2xl border-2 border-border-light text-[15px] font-semibold text-text-secondary hover:bg-surface-raised transition-colors"
        >
          Send Again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 pt-2">

      {/* Recipient */}
      <div>
        <label className="text-[12px] font-bold text-text-secondary uppercase tracking-wider block mb-2">
          Recipient Address
        </label>
        <div className={`flex items-center bg-surface-raised rounded-2xl border-2 transition-colors ${
          to && !toValid ? "border-red-400" : to && toValid ? "border-brand-green" : "border-transparent"
        }`}>
          <input
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value.trim())}
            placeholder="0x…"
            className="flex-1 h-14 bg-transparent px-4 font-mono text-[13px] outline-none text-text-primary placeholder:text-text-muted"
          />
          {to && (
            <button type="button" onClick={() => setTo("")} className="px-3 text-text-muted hover:text-text-primary">
              <X size={16} />
            </button>
          )}
        </div>
        {to && !toValid && (
          <p className="text-[12px] text-red-500 mt-1 ml-1 flex items-center gap-1">
            <AlertCircle size={12} /> Invalid address
          </p>
        )}
      </div>

      {/* Amount */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[12px] font-bold text-text-secondary uppercase tracking-wider">
            Amount
          </label>
          <button
            type="button"
            onClick={() => setAmount(maxHuman.toFixed(6))}
            className="text-[12px] font-semibold text-brand-blue hover:underline"
          >
            Max: {maxHuman.toLocaleString(undefined, { maximumFractionDigits: 6 })} {token.symbol}
          </button>
        </div>
        <div className={`flex items-center bg-surface-raised rounded-2xl border-2 transition-colors ${
          amount && !amountValid ? "border-red-400" : amount && amountValid ? "border-brand-green" : "border-transparent"
        }`}>
          <TokenIcon symbol={token.symbol} size={24} className="ml-4 shrink-0" />
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="0.00"
            className="flex-1 h-14 bg-transparent px-3 font-display font-semibold text-[22px] outline-none text-text-primary placeholder:text-text-muted"
          />
          <span className="text-[14px] font-bold text-text-muted pr-4">{token.symbol}</span>
        </div>
        {amount && !amountValid && amountNum > maxHuman && (
          <p className="text-[12px] text-red-500 mt-1 ml-1 flex items-center gap-1">
            <AlertCircle size={12} /> Insufficient balance
          </p>
        )}
      </div>

      {/* Summary */}
      {toValid && amountValid && (
        <div className="bg-brand-blue/5 border border-brand-blue/10 rounded-2xl p-4 space-y-2 text-[13px]">
          <div className="flex justify-between">
            <span className="text-text-secondary">To</span>
            <span className="font-mono font-semibold">{to.slice(0, 8)}…{to.slice(-6)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Amount</span>
            <span className="font-semibold">{amount} {token.symbol}</span>
          </div>
          <div className="flex justify-between text-[11px] text-text-muted pt-1 border-t border-brand-blue/10">
            <span>Network fee paid separately in native token</span>
          </div>
        </div>
      )}

      {/* Error */}
      {txErrMsg !== null && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-3">
          <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-[12px] text-red-500 leading-relaxed">{txErrMsg}</p>
        </div>
      )}

      {/* Send button */}
      <button
        type="button"
        onClick={handleSend}
        disabled={!canSend}
        className="w-full h-14 rounded-2xl bg-brand-blue text-white text-[16px] font-bold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-brand-blue/90 active:scale-[0.98] transition-all mt-1"
      >
        {isPending ? (
          <><Loader2 size={18} className="animate-spin" /> Confirm in wallet…</>
        ) : isMining ? (
          <><Loader2 size={18} className="animate-spin" /> Broadcasting…</>
        ) : (
          <><Send size={18} /> Send {token.symbol}</>
        )}
      </button>
    </div>
  );
}

/* ─── Tab config ─────────────────────────────────────────────────────────────── */
const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "history", label: "History", icon: <History size={14} />      },
  { id: "receive", label: "Receive", icon: <ArrowDownLeft size={14} /> },
  { id: "send",    label: "Send",    icon: <Send size={14} />          },
];

/* ─── Main sheet ─────────────────────────────────────────────────────────────── */
export function AssetDetailSheet({ token, onClose }: Props) {
  const { address } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("history");
  const [mounted,   setMounted]   = useState(false);
  const [visible,   setVisible]   = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  /* Portal mount + responsive detection */
  useEffect(() => {
    setMounted(true);
    const mq      = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  /* Slide-in animation (10 ms delay lets the CSS transition fire) */
  useEffect(() => {
    if (token) {
      const t = setTimeout(() => setVisible(true), 10);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
    }
  }, [token]);

  /* Reset tab when a new token is selected */
  useEffect(() => {
    if (token) setActiveTab("history");
  }, [token]);

  /* Body scroll lock */
  useEffect(() => {
    document.body.style.overflow = token ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [token]);

  if (!mounted) return null;

  const isOpen = !!token;
  const show   = visible && isOpen;

  const humanBalance = token
    ? parseFloat(formatUnits(token.balance, token.decimals))
    : 0;

  /* ── Desktop: centered modal ──────────────────────────────────────────────── */
  const desktopStyle: React.CSSProperties = {
    position:      "fixed",
    top:           "50%",
    left:          "50%",
    transform:     show
      ? "translate(-50%, -50%) scale(1)"
      : "translate(-50%, -52%) scale(0.96)",
    opacity:       show ? 1 : 0,
    transition:    "transform 0.22s cubic-bezier(0.34,1.2,0.64,1), opacity 0.18s ease",
    background:    "#ffffff",
    borderRadius:  16,
    zIndex:        9999,
    width:         "min(520px, calc(100vw - 48px))",
    maxHeight:     "min(680px, 85dvh)",
    display:       "flex",
    flexDirection: "column",
    boxShadow:     "0 24px 64px rgba(13,33,55,0.22), 0 4px 16px rgba(0,0,0,0.08)",
    pointerEvents: isOpen ? "auto" : "none",
    overflow:      "hidden",
  };

  /* ── Mobile: bottom sheet ─────────────────────────────────────────────────── */
  const mobileStyle: React.CSSProperties = {
    position:      "fixed",
    bottom:        0,
    left:          0,
    right:         0,
    background:    "#ffffff",
    borderRadius:  "20px 20px 0 0",
    zIndex:        9999,
    maxHeight:     "90dvh",
    display:       "flex",
    flexDirection: "column",
    boxShadow:     "0 -8px 40px rgba(0,0,0,0.15)",
    transform:     show ? "translateY(0)" : "translateY(100%)",
    transition:    "transform 0.3s cubic-bezier(0.32,0.72,0,1)",
    pointerEvents: isOpen ? "auto" : "none",
    overflow:      "hidden",
  };

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        role="presentation"
        onClick={onClose}
        style={{
          position:       "fixed",
          inset:          0,
          background:     isDesktop ? "rgba(13,33,55,0.4)" : "rgba(13,33,55,0.55)",
          backdropFilter: isDesktop ? "blur(4px)" : "none",
          zIndex:         9998,
          opacity:        show ? 1 : 0,
          transition:     "opacity 0.22s ease",
          pointerEvents:  isOpen ? "auto" : "none",
        }}
      />

      {/* Panel */}
      <div style={isDesktop ? desktopStyle : mobileStyle}>

        {/* Mobile drag handle */}
        {!isDesktop && (
          <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
            <div style={{ width: 36, height: 4, background: "#CBD5E1", borderRadius: 99 }} />
          </div>
        )}

        {token && (
          <>
            {/* Token header */}
            <div className={`flex items-center gap-3 px-5 pb-4 border-b border-border-light shrink-0 ${isDesktop ? "pt-5" : "pt-2"}`}>
              <TokenIcon symbol={token.symbol} size={44} />
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold text-[19px] text-text-primary leading-tight truncate">
                  {token.name}
                </div>
                <div className="text-[13px] text-text-muted">{token.symbol}</div>
              </div>
              <div className="text-right shrink-0 mr-1">
                <div className="font-bold text-[17px] text-text-primary">
                  {humanBalance.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                </div>
                <AmountDisplay
                  amount={token.usdValue}
                  currency="USD"
                  className="text-[13px] text-text-muted"
                />
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-surface-raised flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-border-light transition-colors shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-surface-raised rounded-xl p-1 mx-5 my-3 shrink-0">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-[13px] font-semibold transition-all ${
                    activeTab === tab.id
                      ? "bg-white shadow-sm text-text-primary"
                      : "text-text-muted hover:text-text-secondary"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 pb-8">
              {activeTab === "history" && <HistoryPanel token={token} />}
              {activeTab === "receive" && address && (
                <ReceivePanel token={token} address={address} />
              )}
              {activeTab === "send" && (
                <SendPanel token={token} onClose={onClose} />
              )}
            </div>
          </>
        )}
      </div>
    </>,
    document.body,
  );
}
