"use client";

import { useRouter }     from "next/navigation";
import { usePrivy }      from "@privy-io/react-auth";
import { useUserStore }  from "@/store/userStore";
import { Wallet }        from "lucide-react";

export function HeroCTA() {
  const router = useRouter();
  const { ready, authenticated } = usePrivy();
  const { hasCompletedOnboarding } = useUserStore();

  const handleCTA = () => {
    if (ready && authenticated) {
      router.push(hasCompletedOnboarding ? "/dashboard" : "/onboarding");
    } else {
      router.push("/login");
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-3 mt-10">
      <button
        onClick={handleCTA}
        className="flex items-center justify-center gap-2.5 w-full sm:w-auto px-7 h-[54px] bg-white text-[#0D2137] rounded-full font-bold text-[15px] shadow-[0_8px_32px_rgba(0,0,0,0.35)] hover:scale-[1.02] active:scale-[0.98] transition-transform"
      >
        <GoogleIcon />
        {ready && authenticated ? "Go to Dashboard" : "Sign in with Google"}
      </button>
      <button
        onClick={handleCTA}
        className="flex items-center justify-center gap-2.5 w-full sm:w-auto px-7 h-[54px] bg-white/10 border border-white/20 text-white rounded-full font-bold text-[15px] hover:bg-white/15 transition-colors backdrop-blur-sm"
      >
        <Wallet size={18} />
        {ready && authenticated ? "Open Wallet" : "Connect Wallet"}
      </button>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}
