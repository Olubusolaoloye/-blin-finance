import React from 'react';
import { cn } from '../../lib/utils';

export function SkeletonLoader({ shape = 'line', className = '' }) {
  const baseStyles = "bg-gradient-to-r from-[#E2E8F0] via-[#F8FAFC] to-[#E2E8F0] animate-shimmer";
  
  const shapes = {
    line: "rounded-[4px]",
    circle: "rounded-full",
    card: "rounded-[var(--radius-lg)]",
  };

  return (
    <div className={cn(baseStyles, shapes[shape], className)} />
  );
}
