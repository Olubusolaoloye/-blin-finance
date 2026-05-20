"use client";

import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import type { HTMLAttributes } from "react";

interface UserAvatarProps extends HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl";
}

export function UserAvatar({ size = "md", className = "", ...props }: UserAvatarProps) {
  const { initials } = useAuth();

  const sizes: Record<string, string> = {
    sm: "w-8 h-8 text-[12px]",
    md: "w-10 h-10 text-[14px]",
    lg: "w-14 h-14 text-[18px]",
    xl: "w-[72px] h-[72px] text-[24px]",
  };

  return (
    <div
      className={cn(
        "rounded-full bg-brand-blue flex items-center justify-center font-display font-bold text-white shadow-sm shrink-0 cursor-pointer",
        sizes[size],
        className,
      )}
      {...props}
    >
      {initials}
    </div>
  );
}
