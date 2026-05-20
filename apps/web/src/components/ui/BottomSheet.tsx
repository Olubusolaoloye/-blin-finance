"use client";

import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  steps?: number;
  currentStep?: number;
  className?: string;
}

export function BottomSheet({
  isOpen,
  onClose,
  children,
  steps = 0,
  currentStep = 0,
  className = "",
}: BottomSheetProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-brand-navy/50 backdrop-blur-[2px] z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={cn(
              "fixed bottom-0 left-0 right-0 bg-white rounded-t-[20px] z-50 max-h-[95vh] flex flex-col shadow-[0_-8px_32px_rgba(0,0,0,0.1)]",
              className,
            )}
          >
            <div className="flex justify-center pt-3 pb-2 shrink-0">
              <div className="w-9 h-1 bg-border-medium rounded-full" />
            </div>

            {steps > 0 && (
              <div className="flex justify-center gap-2 mb-4 shrink-0">
                {Array.from({ length: steps }).map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      scale:           i === currentStep ? 1 : 0.8,
                      backgroundColor: i === currentStep ? "var(--brand-gold)" : "transparent",
                      borderColor:     i === currentStep ? "var(--brand-gold)" : "var(--border-medium)",
                    }}
                    className={cn(
                      "rounded-full border transition-colors",
                      i === currentStep ? "w-2 h-2" : "w-1.5 h-1.5",
                    )}
                  />
                ))}
              </div>
            )}

            <div className="overflow-y-auto pb-safe px-5 pb-6 flex-1">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
