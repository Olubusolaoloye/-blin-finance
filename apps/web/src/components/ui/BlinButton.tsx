"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

interface BlinButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "gold";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export function BlinButton({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  className = "",
  disabled = false,
  ...props
}: BlinButtonProps) {
  const baseStyles =
    "relative inline-flex items-center justify-center font-body font-semibold transition-all duration-200 outline-none focus:ring-2 focus:ring-brand-accent focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants: Record<string, string> = {
    primary:
      "bg-gradient-to-br from-brand-blue to-brand-accent text-white shadow-blue hover:-translate-y-[1px] hover:shadow-lg active:translate-y-0 active:scale-[0.98]",
    secondary:
      "bg-surface-raised text-brand-navy border border-border-medium hover:bg-border-light active:scale-[0.98]",
    ghost:
      "bg-transparent border-[1.5px] border-border-medium text-text-primary hover:border-brand-accent hover:bg-brand-accent/5 active:scale-[0.98]",
    danger:
      "bg-gradient-to-br from-brand-red to-[#CC3333] text-white shadow-md hover:-translate-y-[1px] hover:shadow-lg active:translate-y-0 active:scale-[0.98]",
    gold:
      "bg-gradient-to-br from-brand-gold to-brand-gold-dark text-white shadow-gold hover:-translate-y-[1px] hover:shadow-lg active:translate-y-0 active:scale-[0.98]",
  };

  const sizes: Record<string, string> = {
    sm: "h-[36px] px-4 text-[13px] rounded-full",
    md: "h-[44px] px-6 text-[15px] rounded-full",
    lg: "h-[52px] px-8 text-[15px] rounded-full",
  };

  return (
    <motion.button
      whileTap={!disabled && !isLoading ? { scale: 0.98 } : {}}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      {...(props as any)}
    >
      {isLoading ? (
        <div className="flex items-center space-x-2">
          <div className="w-[18px] h-[18px] rounded-full border-2 border-white/30 border-t-white animate-spin" />
          <span>Loading...</span>
        </div>
      ) : (
        children
      )}
    </motion.button>
  );
}
