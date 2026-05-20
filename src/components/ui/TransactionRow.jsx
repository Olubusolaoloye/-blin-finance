import React from 'react';
import { motion } from 'framer-motion';
import { Repeat, PiggyBank, ArrowDown, ArrowUp, TrendingUp } from 'lucide-react';
import { cn } from '../../lib/utils';

export function TransactionRow({
  type,
  title,
  date,
  amount,
  usdValue,
  isPositive,
  className = '',
  onClick = () => {},
  ...props
}) {
  const getIcon = () => {
    switch (type) {
      case 'swap': return <Repeat size={16} className="text-brand-blue" />;
      case 'save': return <PiggyBank size={16} className="text-brand-gold" />;
      case 'receive': return <ArrowDown size={16} className="text-brand-green" />;
      case 'send': return <ArrowUp size={16} className="text-brand-red" />;
      case 'stock': return <TrendingUp size={16} className="text-[#7C3AED]" />;
      default: return <Repeat size={16} />;
    }
  };

  const getBg = () => {
    switch (type) {
      case 'swap': return 'bg-[#DBEAFE]';
      case 'save': return 'bg-[#FEF3C7]';
      case 'receive': return 'bg-[#D1FAE5]';
      case 'send': return 'bg-[#FEE2E2]';
      case 'stock': return 'bg-[#EDE9FE]';
      default: return 'bg-surface-raised';
    }
  };

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "flex items-center justify-between h-16 px-4 cursor-pointer hover:bg-surface-raised transition-colors rounded-xl",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0", getBg())}>
          {getIcon()}
        </div>
        <div className="flex flex-col">
          <span className="font-body font-bold text-[14px] text-text-primary">{title}</span>
          <span className="font-body text-[12px] text-text-muted">{date}</span>
        </div>
      </div>
      <div className="flex flex-col items-end">
        <span className={cn(
          "font-body font-bold text-[14px]",
          isPositive ? "text-brand-green" : "text-text-primary"
        )}>
          {isPositive ? '+' : ''}{amount}
        </span>
        <span className="font-body text-[12px] text-text-muted">{usdValue}</span>
      </div>
    </motion.div>
  );
}
