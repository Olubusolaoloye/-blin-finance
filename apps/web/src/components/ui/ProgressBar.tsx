"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  progress?: number;
  variant?: "blue" | "gold" | "green";
  showLabel?: boolean;
  className?: string;
}

export function ProgressBar({
  progress = 0,
  variant = "blue",
  showLabel = false,
  className = "",
}: ProgressBarProps) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setWidth(progress), 100);
    return () => clearTimeout(timer);
  }, [progress]);

  const variants: Record<string, string> = {
    blue:  "from-brand-blue to-brand-accent",
    gold:  "from-brand-gold to-brand-gold-dark",
    green: "from-brand-green to-[#00A87E]",
  };

  return (
    <div className={cn("w-full", className)}>
      {showLabel && progress <= 15 && (
        <div className="text-right text-[11px] text-text-muted mb-1">{progress}%</div>
      )}
      <div className="h-2 bg-border-light rounded-full overflow-hidden relative">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${width}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={cn(
            "h-full bg-gradient-to-r rounded-full flex items-center justify-end pr-1",
            variants[variant],
          )}
        >
          {showLabel && progress > 15 && (
            <span className="text-[9px] text-white font-bold">{progress}%</span>
          )}
        </motion.div>
      </div>
    </div>
  );
}
