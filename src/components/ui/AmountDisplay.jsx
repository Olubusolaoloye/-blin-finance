import React from 'react';
import { cn } from '../../lib/utils';
import { SkeletonLoader } from './SkeletonLoader';

export function AmountDisplay({
  amount,
  currency = 'USD',
  showChange = false,
  isLoading = false,
  className = '',
}) {
  if (isLoading) {
    return <SkeletonLoader shape="line" className="w-20 h-5" />;
  }

  const formatAmount = (val, curr) => {
    const num = parseFloat(val);
    if (isNaN(num)) return '0.00';

    if (curr === 'USD') {
      if (Math.abs(num) >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
      if (Math.abs(num) >= 100000) return `$${(num / 1000).toFixed(1)}K`;
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
    }
    if (curr === 'NGN') {
      if (Math.abs(num) >= 1000000) return `₦${(num / 1000000).toFixed(1)}M`;
      if (Math.abs(num) >= 100000) return `₦${(num / 1000).toFixed(1)}K`;
      return `₦${new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 }).format(num)}`;
    }
    // Crypto
    return `${num.toLocaleString('en-US', { maximumSignificantDigits: 6 })} ${curr}`;
  };

  const isPositive = parseFloat(amount) > 0;
  const isNegative = parseFloat(amount) < 0;
  
  let displayAmount = formatAmount(Math.abs(amount), currency);
  if (showChange) {
    if (isPositive) displayAmount = `+${displayAmount}`;
    if (isNegative) displayAmount = `−${displayAmount}`;
  }

  return (
    <span className={cn(
      "font-display",
      showChange && isPositive && "text-brand-green",
      showChange && isNegative && "text-brand-red",
      className
    )}>
      {displayAmount}
    </span>
  );
}
