import { memo } from "react";
import { cn } from "@/lib/utils";

interface TokenIconProps {
  symbol:    string;
  size?:     number;
  className?: string;
}

const SIZE_CLASSES: Record<number, string> = {
  20: "w-5 h-5 text-[9px]",
  24: "w-6 h-6 text-[10px]",
  28: "w-7 h-7 text-[11px]",
  32: "w-8 h-8 text-[13px]",
  36: "w-9 h-9 text-[14px]",
  40: "w-10 h-10 text-[15px]",
  42: "w-[42px] h-[42px] text-[15px]",
  44: "w-11 h-11 text-[16px]",
};

const TOKEN_COLORS: Record<string, string> = {
  USDT:  "#26A17B",
  USDC:  "#2775CA",
  ETH:   "#627EEA",
  WETH:  "#627EEA",
  BNB:   "#F3BA2F",
  WBNB:  "#F3BA2F",
  WBTC:  "#F7931A",
  BTC:   "#F7931A",
  MATIC: "#8247E5",
  ARB:   "#12AAFF",
  LINK:  "#375BD2",
  UNI:   "#FF007A",
  AAVE:  "#B6509E",
  NGN:   "#008751",
  AAPL:  "#555555",
  TSLA:  "#CC0000",
  MSFT:  "#00A4EF",
};

// Cache hash-based colors so we don't recompute on every render
const hashColorCache = new Map<string, string>();

function getHashColor(str: string): string {
  if (hashColorCache.has(str)) return hashColorCache.get(str)!;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c     = (hash & 0x00ffffff).toString(16).toUpperCase();
  const color = "#" + "000000".substring(0, 6 - c.length) + c;
  hashColorCache.set(str, color);
  return color;
}

export const TokenIcon = memo(function TokenIcon({
  symbol,
  size = 28,
  className = "",
}: TokenIconProps) {
  const bgColor  = TOKEN_COLORS[symbol] ?? getHashColor(symbol);
  const initials = symbol.substring(0, 2).toUpperCase();

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center text-white font-bold shrink-0",
        SIZE_CLASSES[size] ?? SIZE_CLASSES[28],
        className,
      )}
      style={{ backgroundColor: bgColor }}
    >
      {initials}
    </div>
  );
});
