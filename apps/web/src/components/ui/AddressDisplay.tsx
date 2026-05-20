"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { clsx } from "clsx";
import { shortenAddress } from "@/lib/format";

interface AddressDisplayProps {
  address: string;
  chars?: number;
  className?: string;
}

export function AddressDisplay({ address, chars = 4, className }: AddressDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={clsx(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-lg",
        "text-text-secondary text-sm font-mono tabular-nums",
        "hover:bg-surface-overlay transition-colors",
        className,
      )}
      title={address}
      aria-label={`Copy address ${address}`}
    >
      <span>{shortenAddress(address, chars)}</span>
      {copied ? (
        <Check size={12} className="text-brand-green" />
      ) : (
        <Copy size={12} className="text-text-tertiary" />
      )}
    </button>
  );
}
