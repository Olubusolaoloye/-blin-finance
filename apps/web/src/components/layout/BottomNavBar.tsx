"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Repeat, TrendingUp, Banknote, LayoutGrid } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

const TABS = [
  { name: "Home",   path: "/dashboard", icon: Home       },
  { name: "Swap",   path: "/swap",      icon: Repeat     },
  { name: "Invest", path: "/stocks",    icon: TrendingUp },
  { name: "Fiat",   path: "/fiat",      icon: Banknote   },
  { name: "More",   path: "/profile",   icon: LayoutGrid },
];

export function BottomNavBar() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 h-[calc(64px+env(safe-area-inset-bottom))] bg-white/92 backdrop-blur-[16px] border-t border-border-light z-30 pb-safe md:hidden">
      <div className="flex items-center justify-around h-[64px] px-2">
        {TABS.map((tab) => {
          const isActive = pathname === tab.path;
          return (
            <Link
              key={tab.name}
              href={tab.path}
              className={cn(
                "relative flex flex-col items-center justify-center w-16 h-full transition-colors",
                isActive ? "text-brand-blue" : "text-text-muted",
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute inset-0 my-1 mx-2 bg-brand-blue/5 rounded-xl"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <motion.div
                animate={isActive ? { scale: [0.8, 1.1, 1] } : { scale: 1 }}
                transition={{ duration: 0.3 }}
                className="relative z-10"
              >
                <tab.icon
                  size={24}
                  strokeWidth={isActive ? 2.5 : 2}
                  className={isActive ? "fill-brand-blue/10" : ""}
                />
              </motion.div>
              <span className={cn("text-[11px] mt-1 z-10", isActive ? "font-semibold" : "font-normal")}>
                {tab.name}
              </span>
              {isActive && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute bottom-1 w-1 h-1 bg-brand-gold rounded-full"
                />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
