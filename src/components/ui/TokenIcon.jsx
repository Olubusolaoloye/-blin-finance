import React from 'react';
import { cn } from '../../lib/utils';

export function TokenIcon({ symbol, size = 28, className = '' }) {
  const sizes = {
    20: "w-5 h-5 text-[9px]",
    28: "w-7 h-7 text-[11px]",
    36: "w-9 h-9 text-[14px]",
    44: "w-11 h-11 text-[16px]",
  };

  const colors = {
    USDT: "#26A17B",
    USDC: "#2775CA",
    ETH: "#627EEA",
    BNB: "#F3BA2F",
    WBTC: "#F7931A",
    AAPL: "#555555",
    TSLA: "#CC0000",
    NGN: "#008751", // Nigerian green
  };

  const getHashColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
  };

  const bgColor = colors[symbol] || getHashColor(symbol);
  const initials = symbol.substring(0, 2).toUpperCase();

  return (
    <div 
      className={cn("rounded-full flex items-center justify-center text-white font-bold shrink-0", sizes[size], className)}
      style={{ backgroundColor: bgColor }}
    >
      {initials}
    </div>
  );
}
