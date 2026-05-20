"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[blin] Global error:", error);
  }, [error]);

  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0D2137] flex flex-col items-center justify-center px-6 text-center">
      <div className="text-[48px] mb-6">⚠️</div>
      <h1 className="font-display font-bold text-[28px] text-white mb-3">
        Something went wrong
      </h1>
      <p className="text-[15px] text-white/50 max-w-[360px] mb-8 leading-relaxed">
        An unexpected error occurred. Your funds are safe — this is a UI issue only.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={reset}
          className="px-8 py-3 bg-[#2E86AB] text-white rounded-full font-semibold text-[15px] hover:bg-[#2678A0] transition-colors"
        >
          Try Again
        </button>
        <button
          onClick={() => router.push("/")}
          className="px-8 py-3 bg-white/10 text-white rounded-full font-semibold text-[15px] hover:bg-white/15 transition-colors"
        >
          Go Home
        </button>
      </div>
    </div>
  );
}
