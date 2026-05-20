import { cn } from "@/lib/utils";

interface SkeletonLoaderProps {
  shape?: "line" | "circle" | "card";
  className?: string;
}

export function SkeletonLoader({ shape = "line", className = "" }: SkeletonLoaderProps) {
  const baseStyles = "bg-gradient-to-r from-[#E2E8F0] via-[#F8FAFC] to-[#E2E8F0] animate-shimmer";

  const shapes: Record<string, string> = {
    line:   "rounded-[4px]",
    circle: "rounded-full",
    card:   "rounded-lg",
  };

  return <div className={cn(baseStyles, shapes[shape], className)} />;
}
