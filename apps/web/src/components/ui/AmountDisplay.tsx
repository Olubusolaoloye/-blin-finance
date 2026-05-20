import { cn } from "@/lib/utils";
import { SkeletonLoader } from "./SkeletonLoader";

interface AmountDisplayProps {
  amount: number;
  currency?: string;
  showChange?: boolean;
  isLoading?: boolean;
  className?: string;
}

export function AmountDisplay({
  amount,
  currency = "USD",
  showChange = false,
  isLoading = false,
  className = "",
}: AmountDisplayProps) {
  if (isLoading) return <SkeletonLoader shape="line" className="w-20 h-5" />;

  const formatAmount = (val: number, curr: string): string => {
    const num = parseFloat(String(val));
    if (isNaN(num)) return "0.00";

    if (curr === "USD") {
      if (Math.abs(num) >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
      if (Math.abs(num) >= 100_000)   return `$${(num / 1_000).toFixed(1)}K`;
      return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
    }
    if (curr === "NGN") {
      if (Math.abs(num) >= 1_000_000) return `₦${(num / 1_000_000).toFixed(1)}M`;
      if (Math.abs(num) >= 100_000)   return `₦${(num / 1_000).toFixed(1)}K`;
      return `₦${new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 }).format(num)}`;
    }
    return `${num.toLocaleString("en-US", { maximumSignificantDigits: 6 })} ${curr}`;
  };

  const isPositive = amount > 0;
  const isNegative = amount < 0;
  let display = formatAmount(Math.abs(amount), currency);
  if (showChange) {
    if (isPositive) display = `+${display}`;
    if (isNegative) display = `−${display}`;
  }

  return (
    <span
      className={cn(
        "font-display",
        showChange && isPositive && "text-brand-green",
        showChange && isNegative && "text-brand-red",
        className,
      )}
    >
      {display}
    </span>
  );
}
