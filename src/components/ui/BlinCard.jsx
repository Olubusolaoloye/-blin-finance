import React from 'react';
import { cn } from '../../lib/utils';

export function BlinCard({
  children,
  variant = 'default',
  accentLeft = false,
  accentColor = 'var(--brand-accent)',
  className = '',
  ...props
}) {
  const baseStyles = "relative overflow-hidden p-5 transition-all duration-200";
  
  const variants = {
    default: "bg-surface-card rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] border border-border-light",
    raised: "bg-surface-card rounded-[var(--radius-lg)] shadow-[var(--shadow-md)]",
    dark: "bg-surface-dark text-white rounded-[var(--radius-lg)] shadow-[var(--shadow-md)]",
    gold: "bg-gradient-to-br from-brand-gold to-brand-gold-dark text-white shadow-[var(--shadow-gold)] rounded-[var(--radius-lg)]",
    glass: "bg-white/70 backdrop-blur-[12px] border border-white/50 rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)]",
  };

  return (
    <div className={cn(baseStyles, variants[variant], className)} {...props}>
      {accentLeft && (
        <div 
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-[var(--radius-lg)]"
          style={{ backgroundColor: accentColor }}
        />
      )}
      {children}
    </div>
  );
}
