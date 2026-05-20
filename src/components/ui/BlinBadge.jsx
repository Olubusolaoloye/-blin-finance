import React from 'react';
import { cn } from '../../lib/utils';

export function BlinBadge({
  children,
  variant = 'neutral',
  showDot = false,
  className = '',
}) {
  const variants = {
    success: "bg-[#D1FAE5] text-[#065F46]",
    warning: "bg-[#FEF3C7] text-[#92400E]",
    error: "bg-[#FEE2E2] text-[#991B1B]",
    info: "bg-[#DBEAFE] text-[#1E40AF]",
    locked: "bg-[#EDE9FE] text-[#5B21B6]",
    neutral: "bg-[#F1F5F9] text-[#475569]",
  };

  const dotColors = {
    success: "bg-brand-green",
    warning: "bg-brand-gold",
    error: "bg-brand-red",
    info: "bg-brand-accent",
    locked: "bg-[#7C3AED]",
    neutral: "bg-text-muted",
  };

  return (
    <span className={cn("inline-flex items-center px-[10px] py-1 rounded-full font-body font-semibold text-[12px]", variants[variant], className)}>
      {showDot && (
        <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5 animate-pulse", dotColors[variant])} />
      )}
      {children}
    </span>
  );
}
