import { formatUnits } from "viem";

/** Format a token amount with up to `maxDecimals` significant decimals. */
export function formatTokenAmount(
  amount: bigint,
  decimals: number,
  maxDecimals = 6,
): string {
  const str = formatUnits(amount, decimals);
  const num = parseFloat(str);
  if (num === 0) return "0";
  if (num < 0.000001) return "<0.000001";
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  });
}

/** Format a USD value with $ prefix and 2 decimal places. */
export function formatUsd(value: number): string {
  if (value === 0) return "$0.00";
  if (value < 0.01) return "<$0.01";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Shorten an Ethereum address: 0x1234…abcd */
export function shortenAddress(address: string, chars = 4): string {
  if (address.length < 10) return address;
  return `${address.slice(0, chars + 2)}…${address.slice(-chars)}`;
}

/** Format a duration in seconds to human-readable string. */
export function formatDuration(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  if (days >= 365) return `${Math.floor(days / 365)}y`;
  if (days >= 30)  return `${Math.floor(days / 30)}mo`;
  if (days >= 7)   return `${Math.floor(days / 7)}w`;
  return `${days}d`;
}

/** Convert basis points to percentage string: 1500 → "15%" */
export function formatBps(bps: number): string {
  return `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 1)}%`;
}
