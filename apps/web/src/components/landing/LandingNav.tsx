"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export function LandingNav() {
  const router = useRouter();
  const { isConnected } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#0D2137]/90 backdrop-blur-[16px] border-b border-white/10 py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
        <div className="flex items-baseline gap-1">
          <span className="font-display font-bold text-[22px] text-white">Blin</span>
          <span className="font-body text-[22px] text-[#2E86AB]">Finance</span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-[14px] text-white/60">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
          <a href="#trust" className="hover:text-white transition-colors">Security</a>
        </div>

        <button
          onClick={() => router.push(isConnected ? "/dashboard" : "/login")}
          className="px-5 py-2.5 rounded-full bg-white text-[#0D2137] text-[14px] font-bold hover:bg-white/90 transition-all shadow-lg"
        >
          {isConnected ? "Open App →" : "Launch App →"}
        </button>
      </div>
    </nav>
  );
}
