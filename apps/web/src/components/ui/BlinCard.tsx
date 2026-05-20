import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

interface BlinCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "raised" | "dark" | "gold" | "glass";
  accentLeft?: boolean;
  accentColor?: string;
}

export function BlinCard({
  children,
  variant = "default",
  accentLeft = false,
  accentColor = "var(--brand-accent)",
  className = "",
  ...props
}: BlinCardProps) {
  const baseStyles = "relative overflow-hidden p-5 transition-all duration-200";

  const variants: Record<string, string> = {
    default: "bg-surface-card rounded-lg shadow-sm border border-border-light",
    raised:  "bg-surface-card rounded-lg shadow-md",
    dark:    "bg-surface-dark text-white rounded-lg shadow-md",
    gold:    "bg-gradient-to-br from-brand-gold to-brand-gold-dark text-white shadow-gold rounded-lg",
    glass:   "bg-white/70 backdrop-blur-[12px] border border-white/50 rounded-lg shadow-sm",
  };

  return (
    <div className={cn(baseStyles, variants[variant], className)} {...props}>
      {accentLeft && (
        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
          style={{ backgroundColor: accentColor }}
        />
      )}
      {children}
    </div>
  );
}
