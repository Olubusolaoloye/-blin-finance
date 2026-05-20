"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, TrendingUp, Clock } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Tooltip,
} from "recharts";
import { BlinCard } from "@/components/ui/BlinCard";
import { BlinBadge } from "@/components/ui/BlinBadge";
import { TokenIcon } from "@/components/ui/TokenIcon";
import { AmountDisplay } from "@/components/ui/AmountDisplay";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { BlinButton } from "@/components/ui/BlinButton";
import { AIInsights } from "@/components/stocks/AIInsights";
import { KYCPrompt } from "@/components/stocks/KYCPrompt";

interface Stock {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  shares: number;
}

interface TooltipPayload {
  value: number;
  payload: { fullDate: string };
}

export default function StocksPage() {
  const [activeTab, setActiveTab]   = useState("US");
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [tradeTab, setTradeTab]     = useState("Buy");
  const [orderType, setOrderType]   = useState("Market");
  const [limitPrice, setLimitPrice] = useState("");
  const [stopLoss, setStopLoss]     = useState("");
  const [timeRange, setTimeRange]   = useState("1D");
  const [kycStatus, setKycStatus]   = useState<"unverified" | "pending" | "verified">("unverified");
  const holdings: Stock[] = [];

  const chartData = useMemo(() => {
    if (!selectedStock) return [];
    const points = ({ "1D": 24, "1W": 7, "1M": 30, "3M": 12, "1Y": 12 } as Record<string, number>)[timeRange] ?? 24;
    const data = [];
    let currentPrice = selectedStock.price * (0.95 + Math.random() * 0.1);
    const now = new Date();
    for (let i: number = points; i >= 0; i--) {
      const date = new Date(now);
      if (timeRange === "1D") date.setHours(now.getHours() - i);
      else if (timeRange === "1W" || timeRange === "1M") date.setDate(now.getDate() - i);
      else if (timeRange === "3M") date.setDate(now.getDate() - i * 7);
      else date.setMonth(now.getMonth() - i);
      currentPrice = currentPrice * (1 + (Math.random() - 0.5) * 0.02);
      data.push({
        time: timeRange === "1D"
          ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : date.toLocaleDateString([], { month: "short", day: "numeric" }),
        price: parseFloat(currentPrice.toFixed(2)),
        fullDate: date.toLocaleString(),
      });
    }
    return data;
  }, [selectedStock, timeRange]);

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-brand-navy p-3 rounded-xl border border-white/10 shadow-2xl">
          <p className="text-[10px] text-white/50 mb-1 font-semibold uppercase">{payload[0]?.payload?.fullDate}</p>
          <p className="text-[16px] font-bold text-white tracking-tight">${Number(payload[0]?.value ?? 0).toFixed(2)}</p>
        </div>
      );
    }
    return null;
  };

  if (kycStatus !== "verified") {
    return (
      <div className="flex flex-col gap-6 pb-10">
        <div className="flex justify-between items-center">
          <h1 className="font-display font-semibold text-[20px] text-text-primary">Stocks</h1>
          <div className="flex gap-1 bg-surface-raised p-1 rounded-full border border-border-light">
            <span className="px-3 py-1 bg-white rounded-full text-[11px] font-bold shadow-sm">ETH</span>
            <span className="px-3 py-1 text-text-muted text-[11px] font-bold">BSC</span>
          </div>
        </div>
        <KYCPrompt onVerify={() => setKycStatus("verified")} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="font-display font-semibold text-[20px] text-text-primary">Stocks</h1>
        <div className="flex gap-1 bg-surface-raised p-1 rounded-full border border-border-light">
          <span className="px-3 py-1 bg-white rounded-full text-[11px] font-bold shadow-sm">ETH</span>
          <span className="px-3 py-1 text-text-muted text-[11px] font-bold">BSC</span>
        </div>
      </div>

      {/* Portfolio Summary */}
      <BlinCard variant="dark" className="bg-gradient-to-br from-[#0D2137] to-[#1A3C6E] p-6">
        <div className="text-[12px] text-white/60 uppercase tracking-wider font-semibold mb-1">Portfolio Value</div>
        <div className="flex items-baseline gap-3 mb-4">
          <AmountDisplay amount={0} currency="USD" className="text-[36px] font-bold text-white leading-none" />
          <BlinBadge variant="neutral" className="border-0">0.00%</BlinBadge>
        </div>
        <div className="h-12 w-full relative mb-4">
          <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-full">
            <defs>
              <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="white" stopOpacity="0.2" />
                <stop offset="100%" stopColor="white" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0,30 L0,30 L100,30 Z" fill="url(#sparkGradient)" />
            <path d="M0,30 L100,30" fill="none" stroke="white" strokeWidth="1.5" strokeOpacity="0.3" />
          </svg>
        </div>
        <div className="text-[13px] text-white/70">0 stocks · buy your first stock to start</div>
      </BlinCard>

      {/* Market Tabs */}
      <div className="flex border-b border-border-light relative">
        <button
          onClick={() => setActiveTab("US")}
          className={`flex-1 py-3 text-[15px] font-semibold transition-colors ${activeTab === "US" ? "text-brand-blue" : "text-text-muted hover:text-text-primary"}`}
        >
          🇺🇸 US Stocks
        </button>
        <button
          onClick={() => setActiveTab("AF")}
          className={`flex-1 py-3 text-[15px] font-semibold transition-colors ${activeTab === "AF" ? "text-brand-blue" : "text-text-muted hover:text-text-primary"}`}
        >
          🌍 African Stocks
        </button>
        <motion.div
          className="absolute bottom-0 h-[2px] bg-brand-blue"
          initial={false}
          animate={{ left: activeTab === "US" ? "0%" : "50%", width: "50%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "US" ? (
          <motion.div key="US" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="flex flex-col gap-4">
            <AIInsights />

            <div className="relative">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
              <input type="text" placeholder="Search stocks..." className="w-full h-14 bg-surface-raised rounded-full pl-12 pr-4 font-body text-[15px] outline-none border border-border-light focus:border-brand-accent transition-colors" />
            </div>

            <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
              {["Trending", "Gainers", "Losers", "All"].map((f, i) => (
                <button key={i} className={`px-4 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap ${i === 0 ? "bg-brand-navy text-white" : "bg-surface-raised border border-border-light text-text-secondary"}`}>{f}</button>
              ))}
            </div>

            <div className="bg-white rounded-[16px] border border-border-light overflow-hidden">
              {holdings.length === 0 ? (
                <div className="p-8 text-center text-text-muted text-[14px]">
                  Your portfolio is empty. Buy your first stock.
                </div>
              ) : (
                holdings.map((stock, i) => (
                  <div
                    key={i}
                    onClick={() => setSelectedStock(stock)}
                    className="flex items-center justify-between p-4 border-b border-border-light last:border-0 hover:bg-surface-raised cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <TokenIcon symbol={stock.symbol} size={44} />
                      <div>
                        <div className="font-bold text-[15px] text-text-primary">{stock.symbol}</div>
                        <div className="text-[13px] text-text-muted">{stock.name}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-[15px] text-text-primary">${stock.price.toFixed(2)}</div>
                      <div className={`text-[12px] font-bold ${stock.changePct >= 0 ? "text-brand-green" : "text-brand-red"}`}>
                        {stock.changePct >= 0 ? "+" : ""}{stock.changePct}%
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div key="AF" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex flex-col items-center text-center py-10">
            <div className="w-16 h-16 bg-surface-raised rounded-full flex items-center justify-center text-[32px] mb-4">🌍</div>
            <h2 className="font-display font-semibold text-[22px] mb-2">African Stocks</h2>
            <p className="text-[15px] text-text-secondary mb-8 max-w-[280px]">Invest in MTN, Dangote, Safaricom and more directly with crypto. Coming soon.</p>
            <div className="w-full bg-white rounded-[16px] border border-border-light overflow-hidden opacity-50 pointer-events-none mb-8">
              {["MTN Nigeria", "Dangote Cement", "Safaricom"].map((name, i) => (
                <div key={i} className="flex items-center justify-between p-4 border-b border-border-light last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-border-medium" />
                    <div className="text-left">
                      <div className="font-bold text-[15px] text-text-primary">{name}</div>
                      <div className="text-[13px] text-text-muted">African Markets</div>
                    </div>
                  </div>
                  <div className="w-16 h-4 bg-border-light rounded" />
                </div>
              ))}
            </div>
            <BlinButton variant="primary" className="w-full max-w-[280px]">Join Waitlist</BlinButton>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stock Detail Sheet */}
      <BottomSheet isOpen={!!selectedStock} onClose={() => setSelectedStock(null)} className="h-[90vh]">
        {selectedStock && (
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-3 mb-6">
              <TokenIcon symbol={selectedStock.symbol} size={44} />
              <div>
                <h2 className="font-display font-bold text-[24px] leading-none">{selectedStock.symbol}</h2>
                <div className="text-[14px] text-text-secondary">{selectedStock.name}</div>
              </div>
            </div>

            <div className="mb-6">
              <div className="font-display font-bold text-[40px] leading-none mb-2">${selectedStock.price.toFixed(2)}</div>
              <BlinBadge variant={selectedStock.changePct >= 0 ? "success" : "error"} className="text-[14px] px-3 py-1">
                {selectedStock.changePct >= 0 ? "+" : ""}${(selectedStock.price * (selectedStock.changePct / 100)).toFixed(2)} ({selectedStock.changePct >= 0 ? "+" : ""}{selectedStock.changePct}%)
              </BlinBadge>
            </div>

            <div className="mb-8">
              <div className="flex justify-between mb-6 bg-surface-raised p-1 rounded-xl">
                {["1D", "1W", "1M", "3M", "1Y"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTimeRange(t)}
                    className={`flex-1 py-1.5 rounded-lg text-[12px] font-bold transition-all ${timeRange === t ? "bg-white text-brand-blue shadow-sm" : "text-text-muted hover:text-text-primary"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={selectedStock.changePct >= 0 ? "#00C896" : "#FF4D4D"} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={selectedStock.changePct >= 0 ? "#00C896" : "#FF4D4D"} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    {/* @ts-ignore */}
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(0,0,0,0.1)", strokeWidth: 1 }} />
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke={selectedStock.changePct >= 0 ? "#00C896" : "#FF4D4D"}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorPrice)"
                      animationDuration={1000}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-8">
              {[
                { l: "Open", v: `$${(selectedStock.price * 0.98).toFixed(2)}` },
                { l: "High", v: `$${(selectedStock.price * 1.02).toFixed(2)}` },
                { l: "Low",  v: `$${(selectedStock.price * 0.95).toFixed(2)}` },
                { l: "Vol",  v: "24.5M" },
              ].map((s, i) => (
                <div key={i} className="bg-surface-raised p-2 rounded-lg text-center">
                  <div className="text-[11px] text-text-muted mb-1">{s.l}</div>
                  <div className="font-bold text-[13px]">{s.v}</div>
                </div>
              ))}
            </div>

            <div className="mt-auto space-y-4">
              <div className="flex p-1 bg-surface-raised rounded-full">
                <button onClick={() => setTradeTab("Buy")} className={`flex-1 py-2 rounded-full text-[14px] font-bold transition-colors ${tradeTab === "Buy" ? "bg-white shadow-sm text-text-primary" : "text-text-secondary"}`}>Buy</button>
                <button onClick={() => setTradeTab("Sell")} className={`flex-1 py-2 rounded-full text-[14px] font-bold transition-colors ${tradeTab === "Sell" ? "bg-white shadow-sm text-text-primary" : "text-text-secondary"}`}>Sell</button>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setOrderType("Market")} className={`flex-1 py-2 px-3 rounded-xl border text-[13px] font-semibold transition-all ${orderType === "Market" ? "bg-brand-blue/5 border-brand-blue text-brand-blue" : "bg-white border-border-light text-text-muted"}`}>Market Order</button>
                <button onClick={() => setOrderType("Limit")} className={`flex-1 py-2 px-3 rounded-xl border text-[13px] font-semibold transition-all ${orderType === "Limit" ? "bg-brand-blue/5 border-brand-blue text-brand-blue" : "bg-white border-border-light text-text-muted"}`}>Limit Order</button>
              </div>

              <div className="space-y-3">
                <div className="bg-surface-raised rounded-2xl p-4">
                  <div className="flex justify-between text-[11px] text-text-secondary font-semibold mb-1 uppercase tracking-wider">
                    <span>{orderType === "Limit" ? "Amount To Invest" : "Amount (USDT)"}</span>
                    <span>Balance: 4,500.00</span>
                  </div>
                  <input type="text" placeholder="0.00" className="w-full bg-transparent font-display font-semibold text-[32px] outline-none text-text-primary placeholder:text-text-muted" />
                </div>

                {orderType === "Limit" && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="bg-surface-raised rounded-2xl p-4 border border-brand-blue/20">
                      <div className="text-[11px] text-text-secondary font-semibold mb-1 uppercase tracking-wider">Limit Price ($)</div>
                      <input type="text" value={limitPrice} onChange={(e) => setLimitPrice(e.target.value)} placeholder={selectedStock.price.toFixed(2)} className="w-full bg-transparent font-display font-semibold text-[24px] outline-none text-text-primary placeholder:text-text-muted" />
                    </div>
                  </motion.div>
                )}

                <div className="bg-surface-raised rounded-2xl p-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] text-text-secondary font-semibold uppercase tracking-wider">Stop Loss (Optional)</span>
                    <Clock size={14} className="text-text-muted" />
                  </div>
                  <input type="text" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} placeholder="None" className="w-full bg-transparent font-display font-semibold text-[20px] outline-none text-text-primary placeholder:text-text-muted" />
                </div>

                <div className="flex justify-between items-center px-2">
                  <span className="text-[12px] text-text-secondary">Expected Shares: <span className="text-text-primary font-bold">0.00</span></span>
                  <span className="text-[12px] text-text-secondary">Est. Fee: <span className="text-text-primary font-bold">$0.50</span></span>
                </div>
              </div>

              <div className="flex items-center gap-2 justify-center py-2 text-[12px] font-semibold text-brand-green">
                <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse" /> Market Open
              </div>

              <BlinButton variant={tradeTab === "Buy" ? "primary" : "secondary"} className="w-full h-[56px] text-[16px]">
                {tradeTab === "Buy" ? "Execute" : "Sell"} {selectedStock.symbol} {orderType === "Limit" ? "Limit" : ""}
              </BlinButton>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
