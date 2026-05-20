"use client";

import { memo } from "react";
import { Repeat, PiggyBank, ArrowDown, ArrowUp, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface TransactionRowProps {
  type:       string;
  title:      string;
  date:       string;
  amount:     string;
  usdValue:   string;
  isPositive?: boolean;
  className?:  string;
  onClick?:    () => void;
}

// Lookup tables outside render — no recreation per call
const ICON_MAP: Record<string, React.ReactNode> = {
  swap:    <Repeat     size={16} className="text-brand-blue"  />,
  save:    <PiggyBank  size={16} className="text-brand-gold"  />,
  receive: <ArrowDown  size={16} className="text-brand-green" />,
  send:    <ArrowUp    size={16} className="text-brand-red"   />,
  stock:   <TrendingUp size={16} className="text-[#7C3AED]"   />,
};

const BG_MAP: Record<string, string> = {
  swap:    "bg-[#DBEAFE]",
  save:    "bg-[#FEF3C7]",
  receive: "bg-[#D1FAE5]",
  send:    "bg-[#FEE2E2]",
  stock:   "bg-[#EDE9FE]",
};

export const TransactionRow = memo(function TransactionRow({
  type,
  title,
  date,
  amount,
  usdValue,
  isPositive = false,
  className  = "",
  onClick,
}: TransactionRowProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        // CSS-only tap feedback — no JS animation overhead
        "flex items-center justify-between h-16 px-4 cursor-pointer",
        "hover:bg-surface-raised active:scale-[0.98] transition-[background-color,transform] duration-150",
        "rounded-xl",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
            BG_MAP[type] ?? "bg-surface-raised",
          )}
        >
          {ICON_MAP[type] ?? <Repeat size={16} />}
        </div>
        <div className="flex flex-col">
          <span className="font-body font-bold text-[14px] text-text-primary">{title}</span>
          <span className="font-body text-[12px] text-text-muted">{date}</span>
        </div>
      </div>

      <div className="flex flex-col items-end">
        <span
          className={cn(
            "font-body font-bold text-[14px]",
            isPositive ? "text-brand-green" : "text-text-primary",
          )}
        >
          {isPositive ? "+" : ""}{amount}
        </span>
        <span className="font-body text-[12px] text-text-muted">{usdValue}</span>
      </div>
    </div>
  );
});
