"use client";

import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[blin] App error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-16 h-16 rounded-full bg-brand-red/10 flex items-center justify-center text-[28px] mb-6">
        ⚡
      </div>
      <h2 className="font-display font-semibold text-[22px] text-text-primary mb-2">
        Page failed to load
      </h2>
      <p className="text-[14px] text-text-secondary mb-8 max-w-[320px] leading-relaxed">
        Something went wrong loading this page. Your wallet and funds are not affected.
      </p>
      <button
        onClick={reset}
        className="px-7 py-3 bg-brand-accent text-white rounded-full font-semibold text-[14px] hover:bg-[#2678A0] transition-colors"
      >
        Reload Page
      </button>
    </div>
  );
}
