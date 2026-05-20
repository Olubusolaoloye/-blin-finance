"use client";

import { motion } from "motion/react";

const TOKENS = [
  { symbol: "ETH",  color: "#627EEA", balance: "1.24",    usd: "$3,520"  },
  { symbol: "USDT", color: "#26A17B", balance: "4,500.00", usd: "$4,500"  },
  { symbol: "BNB",  color: "#F3BA2F", balance: "3.5",     usd: "$2,010"  },
];

export function AppMockup() {
  return (
    <div className="relative w-full max-w-[340px] mx-auto select-none pointer-events-none">

      {/* Glow behind card */}
      <div className="absolute inset-0 bg-[#2E86AB]/20 blur-[60px] rounded-full scale-75" />

      {/* Main balance card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.7, ease: "easeOut" }}
        className="relative z-10 rounded-[28px] overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,0.5)]"
        style={{ background: "linear-gradient(135deg, #0D2137 0%, #1A3C6E 50%, #2E86AB 100%)" }}
      >
        {/* Card shine */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        <div className="absolute top-[-60px] right-[-60px] w-[200px] h-[200px] rounded-full bg-white/5 blur-2xl" />

        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="text-[11px] text-white/50 uppercase tracking-widest font-semibold mb-1">Total Balance</div>
              <div className="font-display font-bold text-[32px] text-white leading-none">$12,450</div>
              <div className="text-[14px] text-white/60 mt-1">≈ ₦19,671,000</div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="px-2.5 py-1 bg-[#00C896]/20 rounded-full text-[#00C896] text-[12px] font-bold">
                +1.18%
              </div>
              <div className="text-[11px] text-white/40">Today</div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 mb-5">
            {["Add Funds", "Withdraw", "Swap"].map((label) => (
              <div key={label} className="flex-1 h-9 rounded-full bg-white/10 flex items-center justify-center text-white text-[12px] font-semibold">
                {label}
              </div>
            ))}
          </div>

          {/* Token list */}
          <div className="space-y-3">
            {TOKENS.map((token, i) => (
              <motion.div
                key={token.symbol}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + i * 0.1 }}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                    style={{ backgroundColor: token.color }}
                  >
                    {token.symbol.slice(0, 2)}
                  </div>
                  <div>
                    <div className="text-white text-[13px] font-semibold">{token.symbol}</div>
                    <div className="text-white/40 text-[11px]">{token.balance}</div>
                  </div>
                </div>
                <div className="text-white text-[13px] font-semibold">{token.usd}</div>
              </motion.div>
            ))}
          </div>

          {/* AutoSave bar */}
          <div className="mt-5 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#F5A623]" />
                <span className="text-[11px] text-white/60 font-semibold">AutoSave Vault</span>
              </div>
              <span className="text-[11px] text-[#F5A623] font-bold">+4.2% APY</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "62%" }}
                transition={{ delay: 1.2, duration: 1, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-[#F5A623] to-[#D4891A] rounded-full"
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-white/40">$1,250 locked</span>
              <span className="text-[10px] text-white/40">62% of goal</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Floating swap card */}
      <motion.div
        initial={{ opacity: 0, x: 30, y: 10 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ delay: 1, duration: 0.6 }}
        className="absolute -right-8 bottom-16 z-20 bg-white rounded-2xl shadow-xl p-3 w-[140px]"
      >
        <div className="text-[10px] text-gray-400 font-semibold mb-2 uppercase tracking-wider">Quick Swap</div>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-[#627EEA] flex items-center justify-center text-white text-[8px] font-bold">ET</div>
            <span className="text-[12px] font-bold">ETH</span>
          </div>
          <span className="text-[12px] text-gray-400">1.0</span>
        </div>
        <div className="flex justify-center my-1">
          <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-[10px]">⇅</div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-[#26A17B] flex items-center justify-center text-white text-[8px] font-bold">US</div>
            <span className="text-[12px] font-bold">USDT</span>
          </div>
          <span className="text-[12px] text-[#00C896] font-bold">2,840</span>
        </div>
      </motion.div>

      {/* Floating NGN badge */}
      <motion.div
        initial={{ opacity: 0, x: -20, y: -10 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="absolute -left-6 top-16 z-20 bg-[#0D2137] border border-white/10 rounded-2xl shadow-xl px-3 py-2.5 flex items-center gap-2"
      >
        <span className="text-lg">🇳🇬</span>
        <div>
          <div className="text-[10px] text-white/50 font-semibold">NGN Rate</div>
          <div className="text-[13px] text-white font-bold">₦1,580 / $1</div>
        </div>
      </motion.div>

    </div>
  );
}
