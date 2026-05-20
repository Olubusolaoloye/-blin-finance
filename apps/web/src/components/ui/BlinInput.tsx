"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import type { InputHTMLAttributes } from "react";

interface BlinInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  variant?: "default" | "large";
  containerClassName?: string;
}

export function BlinInput({
  label,
  error,
  variant = "default",
  className = "",
  containerClassName = "",
  ...props
}: BlinInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  if (variant === "large") {
    return (
      <div className={cn("flex flex-col", containerClassName)}>
        {label && (
          <label className="text-[12px] uppercase tracking-[0.06em] text-text-secondary mb-2">
            {label}
          </label>
        )}
        <input
          className={cn(
            "h-[80px] bg-transparent font-display font-semibold text-[36px] text-text-primary placeholder:text-text-muted outline-none transition-all",
            isFocused ? "border-b-2 border-brand-accent" : "border-b-2 border-transparent",
            className,
          )}
          onFocus={(e) => { setIsFocused(true); props.onFocus?.(e); }}
          onBlur={(e)  => { setIsFocused(false); props.onBlur?.(e); }}
          {...props}
        />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", containerClassName)}>
      {label && (
        <label className="text-[12px] uppercase tracking-[0.06em] text-text-secondary mb-2">
          {label}
        </label>
      )}
      <input
        className={cn(
          "h-[56px] rounded-md border-[1.5px] bg-surface-raised font-body font-medium text-[15px] px-4 text-text-primary placeholder:text-text-muted outline-none transition-all duration-200",
          error
            ? "border-brand-red focus:shadow-[0_0_0_3px_rgba(255,77,77,0.12)]"
            : "border-border-light focus:border-brand-accent focus:bg-white focus:shadow-[0_0_0_3px_rgba(46,134,171,0.15)]",
          props.disabled && "opacity-50 cursor-not-allowed",
          className,
        )}
        onFocus={(e) => { setIsFocused(true); props.onFocus?.(e); }}
        onBlur={(e)  => { setIsFocused(false); props.onBlur?.(e); }}
        {...props}
      />
      <AnimatePresence>
        {error && (
          <motion.span
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="text-[12px] text-brand-red mt-1 overflow-hidden"
          >
            {error}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
