"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import {
  Copy, Check, ArrowRight, CheckCircle2, Building2, Smartphone,
  Info, ChevronDown, ShieldCheck, Clock, Zap, AlertCircle,
  ExternalLink, Wallet, RefreshCw,
} from "lucide-react";
import { BlinButton } from "@/components/ui/BlinButton";
import { BlinCard }   from "@/components/ui/BlinCard";
import { useAuth }    from "@/hooks/useAuth";

// ─── Chain config ──────────────────────────────────────────────────────────────
const FIAT_CHAINS = [
  {
    id:        56,
    key:       "bnb"      as const,
    name:      "BNB Smart Chain",
    shortName: "BNB",
    logo:      "🟡",
    gas:       "~$0.01",
    time:      "3 sec",
    badge:     "Recommended 🇳🇬",
    badgeCls:  "bg-brand-green/10 text-brand-green",
    borderCls: "border-brand-green",
    usdc:      "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
    why:       "Most Nigerians withdraw directly from Binance to BNB. Near-zero fees.",
    explorer:  "https://bscscan.com/tx/",
  },
  {
    id:        42161,
    key:       "arbitrum" as const,
    name:      "Arbitrum One",
    shortName: "ARB",
    logo:      "🔵",
    gas:       "~$0.05",
    time:      "1 sec",
    badge:     "DeFi Native",
    badgeCls:  "bg-brand-blue/10 text-brand-blue",
    borderCls: "border-brand-blue",
    usdc:      "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    why:       "Circle-native USDC. Best for DeFi users already on Arbitrum.",
    explorer:  "https://arbiscan.io/tx/",
  },
] as const;

type FiatChainKey = "bnb" | "arbitrum";

// ─── Constants ─────────────────────────────────────────────────────────────────
const RATE_LOCK_S   = 300;   // 5 min quote lock
const PAY_WINDOW_S  = 1_800; // 30 min payment window

// Escrow wallet receives USDC on offramp; swap to NGN and pay bank
const ESCROW_ADDRESS =
  (process.env.NEXT_PUBLIC_ESCROW_ADDRESS as `0x${string}` | undefined) ??
  "0xBL1NF1NESCROWa1dd4a4cc00000000000000000";

// Virtual account for NGN onramp bank transfer fallback
const BLIN_BANK = {
  bankName:      "Providus Bank",
  accountName:   "Blin Finance Ltd",
  accountNumber: "9971234560",
  sortCode:      "101-001",
};

const PAYMENT_METHODS = [
  { id: "flutterwave", Icon: Zap,        label: "Card / Pay",     time: "Instant",  recommended: true  },
  { id: "bank",        Icon: Building2,  label: "Bank Transfer",  time: "3–5 min",  recommended: false },
  { id: "momo",        Icon: Smartphone, label: "MTN MoMo",       time: "Instant",  recommended: false },
] as const;

const BANKS = [
  "Guaranty Trust Bank", "Zenith Bank", "Access Bank",
  "Kuda Bank", "First Bank", "UBA", "Wema Bank",
  "Opay", "Palmpay", "Moniepoint", "Fidelity Bank", "Sterling Bank",
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
function fmtNgn(n: number) {
  return "₦" + n.toLocaleString("en-NG", { maximumFractionDigits: 0 });
}
function fmtUsdc(n: number) {
  return n.toFixed(2) + " USDC";
}
function fmtTime(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
function generateRef(): string {
  const ts   = Date.now().toString(36).toUpperCase().slice(-5);
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `BLIN-${ts}${rand}`;
}
function shortAddr(addr: string) {
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

// ─── CopyButton helper ─────────────────────────────────────────────────────────
function CopyBtn({ text, className = "" }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className={`flex items-center gap-1 text-brand-accent hover:opacity-70 transition-opacity ${className}`}
    >
      {copied ? <Check size={14} className="text-brand-green" /> : <Copy size={14} />}
      <span className="text-[11px] font-semibold">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function FiatPage() {
  const router = useRouter();
  const { address } = useAuth();

  const [activeTab,     setActiveTab]     = useState<"Add" | "Withdraw">("Add");
  const [amount,        setAmount]        = useState("");
  const [payMethod,     setPayMethod]     = useState<string>("flutterwave");
  const [selectedChain, setSelectedChain] = useState<FiatChainKey>("bnb");
  const [step,          setStep]          = useState<"input" | "pending" | "success">("input");
  const [bank,          setBank]          = useState("");
  const [accountNo,     setAccountNo]     = useState("");
  const [accountName,   setAccountName]   = useState("");
  const [verifying,     setVerifying]     = useState(false);
  const [rateLock,      setRateLock]      = useState<number | null>(null);
  const [txRef,         setTxRef]         = useState("");
  const [countdown,     setCountdown]     = useState(PAY_WINDOW_S);
  const [flwReady,      setFlwReady]      = useState(false);
  const [usdcSent,      setUsdcSent]      = useState(false);

  // ── Live P2P rate (with 1% Blin spread already baked in by /api/rate) ────────
  const [sellRate,    setSellRate]    = useState<number | null>(null);
  const [buyRate,     setBuyRate]     = useState<number | null>(null);
  const [rateLoading, setRateLoading] = useState(true);
  const [rateError,   setRateError]   = useState(false);

  const fetchRate = useCallback(async () => {
    setRateLoading(true);
    setRateError(false);
    try {
      const res  = await fetch("/api/rate");
      const data = await res.json();
      setSellRate(data.sellRate);
      setBuyRate(data.buyRate);
    } catch {
      setRateError(true);
    } finally {
      setRateLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRate();
    const id = setInterval(fetchRate, 120_000);
    return () => clearInterval(id);
  }, [fetchRate]);

  // ── Load Flutterwave SDK ───────────────────────────────────────────────────
  useEffect(() => {
    if (document.querySelector('script[src*="flutterwave"]')) {
      setFlwReady(true);
      return;
    }
    const s = document.createElement("script");
    s.src   = "https://checkout.flutterwave.com/v3.js";
    s.async = true;
    s.onload = () => setFlwReady(true);
    document.head.appendChild(s);
  }, []);

  // ── Derived values ──────────────────────────────────────────────────────────
  const isAdd       = activeTab === "Add";
  const RATE        = isAdd ? (sellRate ?? 0) : (buyRate ?? 0);
  const chain       = FIAT_CHAINS.find((c) => c.key === selectedChain)!;
  const numeric     = parseFloat(amount.replace(/,/g, "")) || 0;
  const fee         = numeric * 0.01;
  const receiveUsdc = isAdd  ? (RATE > 0 ? (numeric - fee) / RATE : 0)    : 0;
  const receiveNgn  = !isAdd ? (RATE > 0 ? (numeric - fee) * RATE  : 0)   : 0;
  const hasQuote    = numeric > 0 && RATE > 0;

  // ── Rate-lock countdown ────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasQuote) { setRateLock(null); return; }
    setRateLock(RATE_LOCK_S);
    const id = setInterval(() => {
      setRateLock((p) => {
        if (p === null || p <= 1) { clearInterval(id); return null; }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [hasQuote, amount, selectedChain]);

  // ── Payment window countdown ───────────────────────────────────────────────
  useEffect(() => {
    if (step !== "pending") return;
    setCountdown(PAY_WINDOW_S);
    const id = setInterval(() => {
      setCountdown((p) => {
        if (p <= 1) { clearInterval(id); return 0; }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [step]);

  // ── Account name verification ──────────────────────────────────────────────
  const verifyRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    setAccountName("");
    if (accountNo.length !== 10 || !bank) return;
    setVerifying(true);
    verifyRef.current = setTimeout(async () => {
      // In prod: call Flutterwave /banks/{id}/accounts/resolve API via your backend
      // For now: simulate a 1.2s network round-trip and return a mock name
      await new Promise((r) => setTimeout(r, 1200));
      const mocks = ["Amara Okonkwo", "Emeka Adeyemi", "Ngozi Okafor", "Chidi Eze", "Fatima Ibrahim"];
      setAccountName(mocks[parseInt(accountNo.slice(-1)) % mocks.length] ?? "");
      setVerifying(false);
    }, 400);
    return () => { if (verifyRef.current) clearTimeout(verifyRef.current); };
  }, [accountNo, bank]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  function reset(tab: "Add" | "Withdraw") {
    setActiveTab(tab);
    setStep("input");
    setAmount("");
    setBank("");
    setAccountNo("");
    setAccountName("");
    setRateLock(null);
    setUsdcSent(false);
  }

  const handleGeneratePayment = useCallback(() => {
    const ref = generateRef();
    setTxRef(ref);
    setStep("pending");
    setUsdcSent(false);
  }, []);

  // Open Flutterwave inline checkout (onramp)
  const openFlwCheckout = useCallback(() => {
    const pubKey = process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY;
    const flw    = (window as unknown as { FlutterwaveCheckout?: (o: unknown) => void }).FlutterwaveCheckout;

    if (!pubKey || !flw) {
      // Key not configured — the UI shows bank transfer instructions instead
      return;
    }

    flw({
      public_key:      pubKey,
      tx_ref:          txRef,
      amount:          numeric,
      currency:        "NGN",
      payment_options: "card,ussd,banktransfer,barter",
      customer: {
        email:        "customer@blin.finance",
        name:         "Blin User",
        phone_number: "",
      },
      meta: {
        usdc_amount:  receiveUsdc.toFixed(6),
        usdc_address: address ?? "",
        chain:        chain.key,
      },
      customizations: {
        title:       "Blin Finance",
        description: `Buy ${fmtUsdc(receiveUsdc)} on ${chain.name}`,
        logo:        "/logo.png",
      },
      callback: (resp: { status: string }) => {
        if (resp.status === "successful" || resp.status === "completed") {
          setStep("success");
        }
      },
      onclose: () => {},
    });
  }, [txRef, numeric, receiveUsdc, address, chain]);

  const FLW_KEY_SET = !!process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY;

  // ── Sub-components ──────────────────────────────────────────────────────────

  const ChainSelector = () => (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[14px] font-semibold text-text-primary">
          {isAdd ? "Receive USDC on" : "Send USDC from"}
        </span>
        <div className="flex items-center gap-1 text-[12px] text-text-muted">
          <Info size={12} />
          <span>Ethereum excluded — gas too expensive</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {FIAT_CHAINS.map((c) => {
          const active = selectedChain === c.key;
          return (
            <button
              key={c.key}
              onClick={() => setSelectedChain(c.key)}
              className={`flex flex-col gap-1 p-4 rounded-2xl border-2 transition-all text-left relative ${
                active
                  ? `${c.borderCls} bg-brand-accent/5`
                  : "border-border-light bg-surface-raised hover:border-border-medium"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[22px]">{c.logo}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.badgeCls}`}>
                  {c.badge}
                </span>
              </div>
              <div className="font-semibold text-[14px] text-text-primary mt-1">{c.name}</div>
              <div className="text-[12px] text-text-muted">Gas: {c.gas} · {c.time}</div>
              {active && (
                <div className="text-[11px] text-text-muted mt-1 border-t border-border-light pt-1">
                  {c.why}
                </div>
              )}
            </button>
          );
        })}
      </div>
      <div className="flex items-start gap-2 bg-brand-red/5 border border-brand-red/20 rounded-xl p-3">
        <span className="text-[16px] mt-0.5">⛽</span>
        <div className="text-[12px] text-text-secondary">
          <span className="font-semibold text-brand-red">Ethereum not available</span> — avg $5–50
          gas per tx would wipe out small NGN deposits.
        </div>
      </div>
    </div>
  );

  const RateCard = () => (
    <div className="flex items-center justify-between bg-surface-raised p-4 rounded-2xl border border-border-light">
      <div className="flex items-center gap-3">
        <div className="text-[24px]">🇳🇬</div>
        <div>
          <div className="font-semibold text-[15px]">
            {isAdd ? "NGN → USDC" : "USDC → NGN"}
          </div>
          <div className="text-[12px] text-text-muted">
            {rateLoading ? (
              <span className="inline-block w-24 h-3 bg-border-light rounded animate-pulse" />
            ) : rateError ? (
              <span className="text-brand-red">
                Unavailable ·{" "}
                <button onClick={fetchRate} className="underline inline-flex items-center gap-1">
                  <RefreshCw size={10} /> retry
                </button>
              </span>
            ) : (
              <span>{fmtNgn(RATE)} = $1</span>
            )}
          </div>
        </div>
      </div>
      {rateLock !== null ? (
        <div className="flex items-center gap-1.5 text-[12px] font-semibold text-brand-gold bg-brand-gold/10 px-3 py-1.5 rounded-full">
          <Clock size={12} />
          <span>{fmtTime(rateLock)}</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-[12px] font-semibold text-brand-green bg-brand-green/10 px-3 py-1.5 rounded-full">
          <span>{rateLoading ? "Fetching…" : "Live"}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-brand-green animate-pulse" />
        </div>
      )}
    </div>
  );

  const QuotePreview = ({ show }: { show: boolean }) =>
    show ? (
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl p-4 mt-4 border border-border-light bg-white shadow-sm"
      >
        <div className="flex justify-between items-center mb-3">
          <span className="text-[14px] text-text-secondary">You receive</span>
          <span className="font-bold text-[18px] text-brand-green">
            {isAdd ? fmtUsdc(receiveUsdc) : fmtNgn(receiveNgn)}
          </span>
        </div>
        <div className="space-y-1.5 border-t border-border-light pt-3">
          <div className="flex justify-between text-[12px] text-text-muted">
            <span>Blin fee (1%)</span>
            <span>{isAdd ? fmtNgn(fee) : `$${fee.toFixed(2)}`}</span>
          </div>
          <div className="flex justify-between text-[12px] text-text-muted">
            <span>Network gas</span>
            <span>{chain.gas}</span>
          </div>
          <div className="flex justify-between text-[12px] text-text-muted">
            <span>Settlement</span>
            <span>{isAdd ? "~2 min after payment" : "5–30 min"}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-border-light text-[12px] text-text-muted">
          <span>{chain.logo}</span>
          <span>{isAdd ? "Lands on" : "Sent from"} {chain.name}</span>
        </div>
      </motion.div>
    ) : null;

  // ── Pending: Onramp ────────────────────────────────────────────────────────
  const OnrampPending = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col gap-5 w-full"
    >
      {/* Header */}
      <div className="text-center">
        <div className="w-14 h-14 rounded-full bg-brand-gold/10 flex items-center justify-center mx-auto mb-4">
          <div className="w-7 h-7 rounded-full border-4 border-brand-gold/30 border-t-brand-gold animate-spin" />
        </div>
        <h2 className="font-display font-semibold text-[22px] mb-1">Complete Your Payment</h2>
        <p className="text-[14px] text-text-secondary">
          Pay <span className="font-bold text-text-primary">{fmtNgn(numeric)}</span> to receive{" "}
          <span className="font-bold text-brand-green">{fmtUsdc(receiveUsdc)}</span>
        </p>
      </div>

      {/* Countdown */}
      <div className={`flex items-center justify-center gap-2 text-[13px] font-semibold rounded-xl py-2 ${
        countdown < 300 ? "bg-brand-red/10 text-brand-red" : "bg-brand-gold/10 text-brand-gold"
      }`}>
        <Clock size={14} />
        <span>Payment window closes in {fmtTime(countdown)}</span>
      </div>

      {/* Reference */}
      <BlinCard className="p-4">
        <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-2">
          Transaction Reference
        </div>
        <div className="flex items-center justify-between bg-surface-raised rounded-xl px-4 py-3">
          <span className="font-mono font-bold text-[15px] tracking-wide">{txRef}</span>
          <CopyBtn text={txRef} />
        </div>
        <p className="text-[11px] text-text-muted mt-2">
          Include this reference in your payment description — required for auto-matching.
        </p>
      </BlinCard>

      {/* Wallet delivery address */}
      {address && (
        <div className="flex items-center gap-3 bg-brand-blue/5 border border-brand-blue/20 rounded-xl p-3">
          <Wallet size={16} className="text-brand-blue shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-bold text-brand-blue uppercase tracking-wide mb-0.5">
              USDC delivery address
            </div>
            <div className="font-mono text-[12px] text-text-primary truncate">{address}</div>
          </div>
          <CopyBtn text={address} />
        </div>
      )}

      {/* Payment options */}
      {FLW_KEY_SET && flwReady ? (
        /* ── Option A: Flutterwave inline checkout ── */
        <div className="flex flex-col gap-3">
          <BlinButton className="w-full" onClick={openFlwCheckout}>
            <Zap size={16} className="mr-2" />
            Pay {fmtNgn(numeric)} Now
          </BlinButton>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-border-light" />
            <span className="text-[11px] text-text-muted">or pay by bank transfer</span>
            <div className="flex-1 h-px bg-border-light" />
          </div>
          <BankTransferInstructions />
        </div>
      ) : (
        /* ── Option B: Manual bank transfer (default) ── */
        <BankTransferInstructions />
      )}

      <BlinButton variant="ghost" className="w-full" onClick={() => setStep("input")}>
        Cancel
      </BlinButton>
    </motion.div>
  );

  // Bank transfer instructions panel (used by both Flutterwave-enabled and fallback)
  const BankTransferInstructions = () => (
    <BlinCard className="p-4 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Building2 size={15} className="text-text-secondary" />
        <span className="font-semibold text-[14px]">Bank Transfer Details</span>
      </div>
      {[
        { label: "Bank",           value: BLIN_BANK.bankName      },
        { label: "Account Name",   value: BLIN_BANK.accountName   },
        { label: "Account Number", value: BLIN_BANK.accountNumber },
        { label: "Amount",         value: fmtNgn(numeric)         },
        { label: "Reference",      value: txRef                   },
      ].map(({ label, value }) => (
        <div key={label} className="flex items-center justify-between bg-surface-raised rounded-lg px-3 py-2.5">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-text-muted">{label}</div>
            <div className="font-semibold text-[13px] text-text-primary">{value}</div>
          </div>
          <CopyBtn text={value} />
        </div>
      ))}
      <p className="text-[11px] text-text-muted pt-1">
        After transfer is confirmed by your bank, USDC lands on {chain.name} within ~2 minutes.
      </p>
    </BlinCard>
  );

  // ── Pending: Offramp ────────────────────────────────────────────────────────
  const OfframpPending = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col gap-5 w-full"
    >
      <div className="text-center">
        <div className="w-14 h-14 rounded-full bg-brand-blue/10 flex items-center justify-center mx-auto mb-4">
          {usdcSent
            ? <div className="w-7 h-7 rounded-full border-4 border-brand-blue/30 border-t-brand-blue animate-spin" />
            : <ShieldCheck size={26} className="text-brand-blue" />
          }
        </div>
        <h2 className="font-display font-semibold text-[22px] mb-1">
          {usdcSent ? "Confirming on-chain…" : "Send USDC to Escrow"}
        </h2>
        <p className="text-[14px] text-text-secondary">
          {usdcSent
            ? `Waiting for your ${fmtUsdc(numeric)} · NGN releasing soon`
            : `Send exactly ${fmtUsdc(numeric)} to lock in your NGN payout`}
        </p>
      </div>

      {/* Countdown */}
      <div className={`flex items-center justify-center gap-2 text-[13px] font-semibold rounded-xl py-2 ${
        countdown < 300 ? "bg-brand-red/10 text-brand-red" : "bg-brand-blue/10 text-brand-blue"
      }`}>
        <Clock size={14} />
        <span>Order expires in {fmtTime(countdown)}</span>
      </div>

      {/* Escrow address */}
      <BlinCard className="p-4 space-y-3">
        <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
          Send USDC to this escrow address
        </div>

        <div className="flex items-center gap-2 bg-surface-raised rounded-xl px-4 py-3">
          <span className="text-[16px]">{chain.logo}</span>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-text-muted font-bold uppercase tracking-wide">{chain.name} · USDC</div>
            <div className="font-mono text-[12px] text-text-primary break-all leading-relaxed">
              {ESCROW_ADDRESS}
            </div>
          </div>
          <CopyBtn text={ESCROW_ADDRESS} />
        </div>

        <div className="flex items-center justify-between bg-brand-green/5 border border-brand-green/20 rounded-xl px-4 py-3">
          <div>
            <div className="text-[10px] text-text-muted font-bold uppercase tracking-wide">Exact amount</div>
            <div className="font-bold text-[18px] text-brand-green">{fmtUsdc(numeric)}</div>
          </div>
          <CopyBtn text={numeric.toFixed(6)} />
        </div>

        <div className="text-[11px] text-text-muted flex items-start gap-1.5">
          <AlertCircle size={12} className="shrink-0 mt-0.5 text-brand-gold" />
          Send exactly the amount above on {chain.name}. Wrong network or amount = funds returned.
        </div>
      </BlinCard>

      {/* Payout summary */}
      <BlinCard className="p-4 space-y-2">
        <div className="text-[13px] font-semibold mb-1">NGN Payout to your bank</div>
        {[
          { label: "Bank",    value: bank       },
          { label: "Account", value: accountNo  },
          { label: "Name",    value: accountName || "—" },
          { label: "Amount",  value: fmtNgn(receiveNgn) },
          { label: "Ref",     value: txRef      },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between text-[13px]">
            <span className="text-text-muted">{label}</span>
            <span className="font-semibold text-text-primary">{value}</span>
          </div>
        ))}
      </BlinCard>

      {!usdcSent ? (
        <BlinButton className="w-full" onClick={() => setUsdcSent(true)}>
          I&apos;ve Sent the USDC <ArrowRight size={16} className="ml-2" />
        </BlinButton>
      ) : (
        <BlinButton
          className="w-full"
          onClick={() => setTimeout(() => setStep("success"), 4000)}
        >
          <RefreshCw size={14} className="mr-2 animate-spin" />
          Checking confirmation…
        </BlinButton>
      )}

      <BlinButton variant="ghost" className="w-full" onClick={() => { setStep("input"); setUsdcSent(false); }}>
        Cancel
      </BlinButton>
    </motion.div>
  );

  // ── Success: Onramp ────────────────────────────────────────────────────────
  const OnrampSuccess = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center text-center py-8"
    >
      <div className="w-20 h-20 rounded-full bg-brand-green/10 flex items-center justify-center mb-5 text-brand-green">
        <CheckCircle2 size={40} />
      </div>
      <h2 className="font-display font-semibold text-[28px] mb-1">Payment Confirmed!</h2>
      <p className="text-[15px] text-text-secondary mb-1">
        <span className="font-bold text-brand-green">{fmtUsdc(receiveUsdc)}</span> added to your wallet
      </p>
      <p className="text-[13px] text-text-muted mb-6">
        on {chain.logo} {chain.name}
      </p>

      {address && (
        <div className="w-full bg-surface-raised rounded-xl p-3 mb-6 text-left">
          <div className="text-[10px] font-bold uppercase tracking-wide text-text-muted mb-1">Delivered to</div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[13px]">{shortAddr(address)}</span>
            <a
              href={`${chain.explorer}${txRef}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-brand-accent text-[12px] font-semibold"
            >
              Explorer <ExternalLink size={12} />
            </a>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 w-full">
        <BlinButton className="w-full" onClick={() => router.push("/dashboard")}>
          View Balance
        </BlinButton>
        <BlinButton variant="ghost" className="w-full" onClick={() => { setStep("input"); setAmount(""); }}>
          Add More NGN
        </BlinButton>
      </div>
    </motion.div>
  );

  // ── Success: Offramp ────────────────────────────────────────────────────────
  const OfframpSuccess = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center text-center py-8"
    >
      <div className="w-20 h-20 rounded-full bg-brand-green/10 flex items-center justify-center mb-5 text-brand-green">
        <CheckCircle2 size={40} />
      </div>
      <h2 className="font-display font-semibold text-[28px] mb-1">NGN On Its Way!</h2>
      <p className="text-[15px] text-text-secondary mb-1">
        <span className="font-bold text-brand-green">{fmtNgn(receiveNgn)}</span> is being sent to your bank
      </p>
      <p className="text-[13px] text-text-muted mb-6">
        Settlement: 5–30 min · Ref: <span className="font-mono font-semibold">{txRef}</span>
      </p>

      <BlinCard className="w-full mb-6 p-4 text-left space-y-2">
        {[
          { label: "Bank",    value: bank       },
          { label: "Account", value: accountNo  },
          { label: "Name",    value: accountName || "—" },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between text-[13px]">
            <span className="text-text-muted">{label}</span>
            <span className="font-semibold">{value}</span>
          </div>
        ))}
      </BlinCard>

      <div className="flex flex-col gap-3 w-full">
        <BlinButton className="w-full" onClick={() => router.push("/dashboard")}>
          View Dashboard
        </BlinButton>
        <BlinButton variant="ghost" className="w-full" onClick={() => reset("Withdraw")}>
          Withdraw More
        </BlinButton>
      </div>
    </motion.div>
  );

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center max-w-[560px] mx-auto w-full pb-10">

      <div className="w-full flex justify-between items-center mb-6">
        <h1 className="font-display font-semibold text-[20px]">Add &amp; Withdraw</h1>
      </div>

      {/* Tabs */}
      <div className="flex w-full border-b border-border-light relative mb-8">
        {(["Add", "Withdraw"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => reset(tab)}
            className={`flex-1 py-3 text-[15px] font-semibold transition-colors ${
              activeTab === tab ? "text-brand-blue" : "text-text-muted hover:text-text-primary"
            }`}
          >
            {tab === "Add" ? "Add NGN" : "Withdraw NGN"}
          </button>
        ))}
        <motion.div
          className="absolute bottom-0 h-[2px] bg-brand-blue"
          initial={false}
          animate={{ left: activeTab === "Add" ? "0%" : "50%", width: "50%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      </div>

      <AnimatePresence mode="wait">

        {/* ── ADD (NGN → USDC) ─────────────────────────────────────────────── */}
        {activeTab === "Add" && (
          <motion.div
            key="Add"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="w-full flex flex-col gap-6"
          >
            {step === "input" && (
              <>
                <RateCard />
                <ChainSelector />

                {/* Amount */}
                <div className="bg-surface-raised rounded-2xl p-6 border border-border-light focus-within:border-brand-accent transition-colors">
                  <div className="text-[12px] text-text-muted mb-2 font-semibold uppercase tracking-wide">
                    You pay (NGN)
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-display font-semibold text-[40px] text-text-muted">₦</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                      className="bg-transparent font-display font-semibold text-[40px] w-full outline-none text-text-primary placeholder:text-text-muted"
                    />
                  </div>
                  <QuotePreview show={hasQuote} />
                </div>

                {/* Quick pills */}
                <div className="flex gap-2 -mt-3">
                  {[5_000, 10_000, 25_000, 50_000].map((v) => (
                    <button
                      key={v}
                      onClick={() => setAmount(String(v))}
                      className="flex-1 text-[12px] font-semibold py-1.5 rounded-lg border border-border-light bg-surface-raised hover:border-brand-accent hover:text-brand-accent transition-colors"
                    >
                      ₦{(v / 1000).toFixed(0)}k
                    </button>
                  ))}
                </div>

                {/* Payment method */}
                <div>
                  <div className="text-[14px] font-semibold text-text-primary mb-3">Pay via</div>
                  <div className="grid grid-cols-3 gap-3">
                    {PAYMENT_METHODS.map(({ id, Icon, label, time, recommended }) => (
                      <button
                        key={id}
                        onClick={() => setPayMethod(id)}
                        className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all relative ${
                          payMethod === id
                            ? "border-brand-accent bg-brand-accent/5"
                            : "border-border-light bg-surface-raised hover:border-border-medium"
                        }`}
                      >
                        {recommended && (
                          <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-bold bg-brand-green text-white px-1.5 py-0.5 rounded-full whitespace-nowrap">
                            Best
                          </span>
                        )}
                        <Icon size={22} className={payMethod === id ? "text-brand-accent" : "text-text-muted"} />
                        <span className={`font-semibold text-[12px] mt-2 mb-1 ${payMethod === id ? "text-brand-accent" : "text-text-primary"}`}>
                          {label}
                        </span>
                        <span className="text-[11px] text-text-muted">{time}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[12px] text-text-muted mt-2">
                    Nigerian cards, bank transfer, OPay &amp; MoMo supported.
                  </p>
                </div>

                <BlinButton
                  className="w-full"
                  disabled={!amount || numeric < 1_000 || !hasQuote}
                  onClick={handleGeneratePayment}
                >
                  Proceed to Payment <ArrowRight size={16} className="ml-2" />
                </BlinButton>
                <p className="text-center text-[12px] text-text-muted -mt-3">
                  Minimum ₦1,000 · 1% Blin fee · ~2 min settlement
                </p>
              </>
            )}

            {step === "pending" && <OnrampPending />}
            {step === "success" && <OnrampSuccess />}
          </motion.div>
        )}

        {/* ── WITHDRAW (USDC → NGN) ─────────────────────────────────────────── */}
        {activeTab === "Withdraw" && (
          <motion.div
            key="Withdraw"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="w-full flex flex-col gap-6"
          >
            {step === "input" && (
              <>
                <RateCard />
                <ChainSelector />

                {/* Escrow trust notice */}
                <div className="flex items-start gap-3 bg-brand-blue/5 border border-brand-blue/20 rounded-2xl p-4">
                  <ShieldCheck size={20} className="text-brand-blue mt-0.5 shrink-0" />
                  <div className="text-[13px] text-text-secondary">
                    <span className="font-semibold text-text-primary">Protected by on-chain escrow.</span>{" "}
                    Your USDC is locked in a smart contract. NGN is sent to your bank first — if the
                    transfer fails, USDC is automatically returned within 30 min.
                  </div>
                </div>

                {/* Amount */}
                <div className="bg-surface-raised rounded-2xl p-6 border border-border-light focus-within:border-brand-accent transition-colors">
                  <div className="text-[12px] text-text-muted mb-2 font-semibold uppercase tracking-wide">
                    You send (USDC on {chain.shortName})
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-display font-semibold text-[40px] text-text-muted">$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                      className="bg-transparent font-display font-semibold text-[40px] w-full outline-none text-text-primary placeholder:text-text-muted"
                    />
                  </div>
                  <QuotePreview show={hasQuote} />
                </div>

                {/* Quick pills */}
                <div className="flex gap-2 -mt-3">
                  {[10, 25, 50, 100].map((v) => (
                    <button
                      key={v}
                      onClick={() => setAmount(String(v))}
                      className="flex-1 text-[12px] font-semibold py-1.5 rounded-lg border border-border-light bg-surface-raised hover:border-brand-accent hover:text-brand-accent transition-colors"
                    >
                      ${v}
                    </button>
                  ))}
                </div>

                {/* Bank details */}
                <BlinCard className="p-5">
                  <h3 className="font-bold text-[15px] mb-4">Bank Details</h3>
                  <div className="space-y-3">
                    {/* Bank selector */}
                    <div className="relative">
                      <select
                        value={bank}
                        onChange={(e) => setBank(e.target.value)}
                        className="w-full h-14 bg-surface-raised rounded-xl px-4 font-body text-[15px] outline-none border border-border-light focus:border-brand-accent appearance-none"
                      >
                        <option value="">Select Bank</option>
                        {BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
                      </select>
                      <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                    </div>

                    {/* Account number */}
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Account Number (10 digits)"
                        maxLength={10}
                        value={accountNo}
                        onChange={(e) => setAccountNo(e.target.value.replace(/\D/g, ""))}
                        className="w-full h-14 bg-surface-raised rounded-xl px-4 font-body text-[15px] outline-none border border-border-light focus:border-brand-accent"
                      />
                      {verifying && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                          <div className="w-4 h-4 rounded-full border-2 border-brand-accent/30 border-t-brand-accent animate-spin" />
                        </div>
                      )}
                    </div>

                    {/* Verified name */}
                    <AnimatePresence>
                      {accountName && (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-2 bg-brand-green/5 border border-brand-green/20 p-3 rounded-xl"
                        >
                          <CheckCircle2 size={16} className="text-brand-green shrink-0" />
                          <div>
                            <div className="font-semibold text-[14px] text-text-primary">{accountName}</div>
                            <div className="text-[11px] text-text-muted">Account verified</div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </BlinCard>

                <BlinButton
                  className="w-full"
                  disabled={!amount || numeric < 1 || !bank || accountNo.length < 10 || !accountName || !hasQuote}
                  onClick={handleGeneratePayment}
                >
                  Withdraw to Bank <ArrowRight size={16} className="ml-2" />
                </BlinButton>
                <p className="text-center text-[12px] text-text-muted -mt-3">
                  Min $1 · 1% Blin fee · NGN in 5–30 min
                </p>
              </>
            )}

            {step === "pending" && <OfframpPending />}
            {step === "success" && <OfframpSuccess />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
