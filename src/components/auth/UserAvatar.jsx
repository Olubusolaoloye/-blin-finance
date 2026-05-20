import React from 'react';
import { cn } from '../../lib/utils';

export function UserAvatar({ size = 'md', className = '', onClick = () => {}, ...props }) {
  const sizes = {
    sm: "w-8 h-8 text-[12px]",
    md: "w-10 h-10 text-[14px]",
    lg: "w-14 h-14 text-[18px]",
    xl: "w-[72px] h-[72px] text-[24px]",
  };

  return (
    <div 
      className={cn("rounded-full bg-brand-blue flex items-center justify-center font-display font-bold text-white shadow-sm shrink-0", sizes[size], className)}
      onClick={onClick}
    >
      AO
    </div>
  );
}
