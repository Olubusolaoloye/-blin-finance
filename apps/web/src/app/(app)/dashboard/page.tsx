"use client";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { formatUnits } from "viem";
import {
  Copy, ArrowUpRight, ArrowDownLeft, Repeat,
  PiggyBank, TrendingUp, Banknote, ChevronRight, RefreshCw,
} from "lucide-react";
import { UserAvatar } from "@/components/auth/UserAvatar";
import { BlinCard } from "@/components/ui/BlinCard";
import { BlinBadge } from "@/components/ui/BlinBadge";
import { TokenIcon } from "@/components/ui/TokenIcon";
import { AmountDisplay } from "@/components/ui/AmountDisplay";
import { TransactionRow } from "@/components/ui/TransactionRow";
import { useAuth } from "@/hooks/useAuth";
import { usePortfolio } from "@/hooks/usePortfolio";
import { useAlchemyTransfers } from "@/hooks/useAlchemyTransfers";

// Vault contracts not deployed yet
const vaultEnabled = false;

export default function Dashboard() {
  const router = useRouter();
  const { address, shortAddress, firstName } = useAuth();

  const {
    tokens,
    totalUsd,
    totalNgn,
    dayChangePct,
    dayChangeUsd,
    isLoading: portfolioLoading,
    isFetching: portfolioFetching,
  } = usePortfolio();

  const {
    transfers,
    isLoading: txLoading,
  } = useAlchemyTransfers(10);

  return (
    <div className="flex flex-col gap-6 md:gap-8">

      {/* Header */}
      <header className="flex items-center justify-between sticky top-0 bg-surface-bg/90 backdrop-blur-md z-20 py-4 -mx-4 px-4 md:mx-0 md:px-0">
        <div>
          <h1 className="font-body font-semibold text-[16px] text-text-primary">
            Good {getGreeting()}{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="text-[12px] text-text-muted">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-3 md:hidden">
          {portfolioFetching && (
            <RefreshCw size={14} className="text-text-muted animate-spin" />
          )}
          <UserAvatar size="md" className="cursor-pointer" onClick={() => router.push("/profile")} />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

        {/* Left Column */}
        <div className="lg:col-span-7 flex flex-col gap-6">

          {/* Wallet Balance Card */}
          <BlinCard
            variant="dark"
            className="bg-gradient-to-br from-[#0D2137] via-[#1A3C6E] to-[#2E86AB] p-6 md:p-8"
          >
            <div className="absolute top-[-50px] right-[-50px] w-[300px] h-[300px] rounded-full bg-white/5 blur-[40px]" />
            <div className="absolute bottom-[-50px] left-[-50px] w-[200px] h-[200px] rounded-full bg-white/5 blur-[30px]" />

            <div className="relative z-10">
              <div className="text-[12px] text-white/60 uppercase tracking-wider font-semibold mb-2">
                Total Balance
              </div>

              {portfolioLoading ? (
                <div className="flex flex-col gap-2 mb-4 animate-pulse">
                  <div className="h-10 w-48 bg-white/10 rounded-xl" />
                  <div className="h-6 w-32 bg-white/10 rounded-lg" />
                </div>
              ) : (
                <div className="flex flex-col gap-1 mb-4">
                  <div className="flex items-baseline gap-2">
                    <AmountDisplay
                      amount={totalUsd}
                      currency="USD"
                      className="text-[40px] md:text-[44px] text-white leading-none font-bold"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white/50 text-[14px]">≈</span>
                    <AmountDisplay
                      amount={totalNgn}
                      currency="NGN"
                      className="text-[18px] md:text-[20px] text-white/80 leading-none"
                    />
                  </div>
                </div>
              )}

              <div className={`inline-flex items-center px-2 py-1 rounded-full text-[12px] font-semibold mb-6 ${dayChangePct >= 0 ? "bg-[#00C896]/15 text-brand-green" : "bg-brand-red/15 text-brand-red"}`}>
                {dayChangePct >= 0 ? "+" : ""}₦{Math.abs(dayChangeUsd * 1580).toLocaleString(undefined, { maximumFractionDigits: 0 })} ({dayChangePct >= 0 ? "+" : ""}{dayChangePct.toFixed(2)}%) today
              </div>

              <div className="flex items-center gap-2 mb-8">
                <span className="font-mono text-[13px] text-white/70">
                  {shortAddress ?? (address ? `${address.substring(0, 6)}…${address.substring(38)}` : "0x0000…0000")}
                </span>
                <button
                  onClick={() => address && navigator.clipboard.writeText(address)}
                  className="text-white/50 hover:text-white"
                >
                  <Copy size={14} />
                </button>
                <div className="w-1 h-1 bg-white/30 rounded-full mx-1" />
                <span className="w-4 h-4 rounded-full bg-[#627EEA] flex items-center justify-center text-[8px] font-bold">E</span>
                <span className="w-4 h-4 rounded-full bg-[#F3BA2F] flex items-center justify-center text-[8px] font-bold text-black">B</span>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => router.push("/fiat")}
                  className="flex-1 flex items-center justify-center gap-2 h-11 bg-white/15 hover:bg-white/25 text-white rounded-full text-[14px] font-semibold transition-colors backdrop-blur-sm"
                >
                  <ArrowDownLeft size={18} /> Add Funds
                </button>
                <button
                  onClick={() => router.push("/fiat")}
                  className="flex-1 flex items-center justify-center gap-2 h-11 bg-white/15 hover:bg-white/25 text-white rounded-full text-[14px] font-semibold transition-colors backdrop-blur-sm"
                >
                  <ArrowUpRight size={18} /> Withdraw
                </button>
              </div>
            </div>
          </BlinCard>

          {/* Quick Actions */}
          <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2 -mx-4 px-4 md:mx-0 md:px-0">
            {[
              { icon: Repeat,       label: "Swap",      path: "/swap",    color: "text-brand-blue"   },
              { icon: PiggyBank,    label: "Save",      path: "/vaults",  color: "text-brand-gold"   },
              { icon: TrendingUp,   label: "Buy Stock", path: "/stocks",  color: "text-[#7C3AED]"    },
              { icon: Banknote,     label: "Add NGN",   path: "/fiat",    color: "text-brand-green"  },
              { icon: ArrowUpRight, label: "Send",      path: "/swap",    color: "text-text-primary" },
            ].map((action, i) => (
              <motion.button
                key={i}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push(action.path)}
                className="flex items-center gap-2 h-11 px-5 bg-white rounded-full shadow-sm border border-border-light shrink-0 hover:bg-surface-raised transition-colors"
              >
                <action.icon size={16} className={action.color} />
                <span className="font-semibold text-[14px] text-text-primary">{action.label}</span>
              </motion.button>
            ))}
          </div>

          {/* AutoSave Snapshot — contracts not deployed yet */}
          {vaultEnabled === false && (
            <BlinCard
              variant="dark"
              className="bg-gradient-to-br from-[#1A3C6E] to-[#2E86AB] text-center p-8 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => router.push("/vaults")}
            >
              <PiggyBank size={48} className="text-brand-gold mx-auto mb-3" />
              <h2 className="font-display font-semibold text-[18px] text-white mb-1">Start AutoSaving</h2>
              <p className="text-[13px] text-white/70">Save a % of every swap automatically and earn yield while it&apos;s locked.</p>
            </BlinCard>
          )}

          {/* Token Balances */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-[16px] text-text-primary">Your Assets</h2>
              <button className="text-[13px] font-semibold text-brand-accent hover:underline">
                Manage &rarr;
              </button>
            </div>
            <div className="bg-white rounded-[16px] border border-border-light overflow-hidden">
              {portfolioLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-4 border-b border-border-light last:border-0 animate-pulse"
                    >
                      <div className="w-9 h-9 rounded-full bg-border-light shrink-0" />
                      <div className="flex-1 flex flex-col gap-2">
                        <div className="h-3 w-24 bg-border-light rounded-full" />
                        <div className="h-2.5 w-16 bg-border-light rounded-full" />
                      </div>
                      <div className="h-3.5 w-16 bg-border-light rounded-full" />
                    </div>
                  ))
                : tokens.length === 0
                  ? (
                    <div className="p-8 text-center text-text-muted text-[14px]">
                      No assets found. Connect a wallet and add funds to get started.
                    </div>
                  )
                  : tokens.map((token, i) => {
                    const humanBalance = parseFloat(formatUnits(token.balance, token.decimals));
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between p-4 border-b border-border-light last:border-0 hover:bg-surface-raised transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <TokenIcon symbol={token.symbol} size={36} />
                          <div>
                            <div className="font-bold text-[15px] text-text-primary">{token.name}</div>
                            <div className="text-[13px] text-text-muted">{token.symbol}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-[15px] text-text-primary">
                            {humanBalance.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                          </div>
                          <AmountDisplay
                            amount={token.usdValue}
                            currency="USD"
                            className="text-[13px] text-text-muted"
                          />
                        </div>
                      </div>
                    );
                  })}
            </div>
          </div>

        </div>

        {/* Right Column */}
        <div className="lg:col-span-5 flex flex-col gap-6">

          {/* Stocks Portfolio — coming soon */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-[16px] text-text-primary">Stocks Portfolio</h2>
              <button
                onClick={() => router.push("/stocks")}
                className="text-[13px] font-semibold text-brand-accent hover:underline"
              >
                View Portfolio &rarr;
              </button>
            </div>
            <BlinCard className="p-0">
              <div className="p-5 border-b border-border-light">
                <div className="text-[13px] text-text-secondary mb-1">Total Value</div>
                <div className="flex items-baseline gap-2">
                  <AmountDisplay amount={0} currency="USD" className="text-[24px] font-bold" />
                  <BlinBadge variant="neutral">0.00%</BlinBadge>
                </div>
              </div>
              <div className="p-5 text-center text-text-muted text-[14px]">
                <TrendingUp size={32} className="mx-auto mb-2 text-border-medium" />
                <p>Stocks coming soon. Buy your first stock to start your portfolio.</p>
              </div>
            </BlinCard>
          </div>

          {/* Recent Activity */}
          <div>
            <h2 className="font-bold text-[16px] text-text-primary mb-4">Recent Activity</h2>
            <div className="bg-white rounded-[16px] border border-border-light overflow-hidden">
              {txLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-4 border-b border-border-light last:border-0 animate-pulse"
                    >
                      <div className="w-10 h-10 rounded-full bg-border-light shrink-0" />
                      <div className="flex-1 flex flex-col gap-2">
                        <div className="h-3 w-32 bg-border-light rounded-full" />
                        <div className="h-2.5 w-20 bg-border-light rounded-full" />
                      </div>
                      <div className="h-3.5 w-16 bg-border-light rounded-full" />
                    </div>
                  ))
                : transfers.length === 0
                  ? (
                    <div className="p-8 text-center text-text-muted text-[14px]">
                      No recent transactions found.
                    </div>
                  )
                  : transfers.slice(0, 5).map((tx) => (
                    <TransactionRow
                      key={tx.id}
                      type={tx.type as "swap" | "save" | "receive" | "send" | "stock"}
                      title={tx.title}
                      date={tx.date}
                      amount={tx.amount}
                      usdValue={tx.usdValue}
                      isPositive={tx.isPositive}
                      className="border-b border-border-light last:border-0 rounded-none"
                    />
                  ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── Greeting helper ──────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
