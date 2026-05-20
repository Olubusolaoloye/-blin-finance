import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

export function ProgressBar({
  progress = 0,
  variant = 'blue',
  showLabel = false,
  className = '',
}) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    // Animate on mount
    const timer = setTimeout(() => setWidth(progress), 100);
    return () => clearTimeout(timer);
  }, [progress]);

  const variants = {
    blue: "from-brand-blue to-brand-accent",
    gold: "from-brand-gold to-brand-gold-dark",
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
          className={cn("h-full bg-gradient-to-r rounded-full flex items-center justify-end pr-1", variants[variant])}
        >
          {showLabel && progress > 15 && (
            <span className="text-[9px] text-white font-bold">{progress}%</span>
          )}
        </motion.div>
      </div>
    </div>
  );
}
