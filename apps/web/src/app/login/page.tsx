"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { ArrowRight, ShieldCheck, Zap, Lock, CheckCircle2, Wallet, Mail } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { useUserStore } from "@/store/userStore";

// Deterministic particle data — avoids SSR/CSR hydration mismatch from Math.random()
const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  width:    (i * 17 % 4) + 2,
  height:   (i * 13 % 4) + 2,
  color:    i % 2 === 0 ? "var(--brand-gold)" : "white",
  left:     (i * 37 % 100),
  top:      (i * 53 % 100),
  opacity:  (i * 7 % 30) / 100 + 0.2,
  duration: (i * 11 % 10) + 10,
}));

// ─── Smart wallet creation steps (visual feedback during OAuth) ───────────────

const SMART_WALLET_STEPS = [
  { id: "auth",    label: "Authenticating with provider…"     },
  { id: "keys",    label: "Generating secure key shards…"     },
  { id: "wallet",  label: "Creating your smart wallet…"       },
  { id: "ready",   label: "Wallet ready — no seed phrase! 🎉" },
];

const WALLET_STEPS = [
  { id: "init",    label: "Initializing Web3 provider…"       },
  { id: "request", label: "Requesting wallet access…"         },
  { id: "sign",    label: "Verifying ownership signature…"    },
  { id: "auth",    label: "Authenticating session…"           },
];

type LoginType = "social" | "wallet" | "email" | null;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Login() {
  const router = useRouter();
  const { ready, authenticated, login } = usePrivy();
  const { hasCompletedOnboarding } = useUserStore();

  const [isLoggingIn,       setIsLoggingIn]       = useState(false);
  const [loginType,         setLoginType]         = useState<LoginType>(null);
  const [currentStepIndex,  setCurrentStepIndex]  = useState(-1);
  const [loginError,        setLoginError]        = useState<string | null>(null);

  // Redirect once Privy has authenticated the user
  useEffect(() => {
    if (ready && authenticated) {
      router.replace(hasCompletedOnboarding ? "/dashboard" : "/onboarding");
    }
  }, [ready, authenticated, hasCompletedOnboarding, router]);

  // Don't flash login UI while Privy is re-hydrating a saved session
  if (!ready || authenticated) return null;

  // ── Animate loading steps while OAuth popup is open ─────────────────────
  const startStepAnimation = (type: LoginType) => {
    setLoginType(type);
    setIsLoggingIn(true);
    setLoginError(null);
    setCurrentStepIndex(0);
    const steps = type === "wallet" ? WALLET_STEPS : SMART_WALLET_STEPS;
    steps.forEach((_, i) => {
      setTimeout(() => setCurrentStepIndex(i), i * 900);
    });
  };

  // ── Social login handlers ────────────────────────────────────────────────

  const handleSocialLogin = async (provider: "google" | "apple") => {
    startStepAnimation("social");
    try {
      await login({ loginMethods: [provider] });
      // On success: useEffect above handles redirect
    } catch {
      // User closed the popup or an error occurred
      setIsLoggingIn(false);
      setCurrentStepIndex(-1);
      setLoginType(null);
      setLoginError("Login was cancelled or failed. Please try again.");
    }
  };

  const handleEmailLogin = async () => {
    startStepAnimation("email");
    try {
      await login({ loginMethods: ["email"] });
    } catch {
      setIsLoggingIn(false);
      setCurrentStepIndex(-1);
      setLoginType(null);
      setLoginError("Login was cancelled. Please try again.");
    }
  };

  const handleWalletLogin = async () => {
    startStepAnimation("wallet");
    try {
      await login({ loginMethods: ["wallet"] });
    } catch {
      setIsLoggingIn(false);
      setCurrentStepIndex(-1);
      setLoginType(null);
      setLoginError("Wallet connection cancelled.");
    }
  };

  const activeSteps = loginType === "wallet" ? WALLET_STEPS : SMART_WALLET_STEPS;

  // ────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-surface-dark font-body">

      {/* ── Left hero panel ──────────────────────────────────────────────── */}
      <div className="relative flex-1 flex flex-col justify-center items-center p-8 overflow-hidden bg-gradient-to-br from-[#0D2137] to-[#1A3C6E]">
        {/* Floating particles */}
        {PARTICLES.map((p, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full pointer-events-none"
            style={{
              width:           p.width + "px",
              height:          p.height + "px",
              backgroundColor: p.color,
              left:            p.left + "%",
              top:             p.top + "%",
              opacity:         p.opacity,
            }}
            animate={{ y: [0, -100], opacity: [0, 0.5, 0] }}
            transition={{ duration: p.duration, repeat: Infinity, ease: "linear" }}
          />
        ))}

        <div className="relative z-10 text-center md:text-left max-w-md w-full hidden md:block">
          <div className="flex items-baseline gap-1 mb-6">
            <span className="font-display font-bold text-[40px] text-white">Blin</span>
            <span className="font-body text-[40px] text-brand-accent">Finance</span>
          </div>
          <h1 className="font-display font-bold text-[48px] text-white leading-[1.1] mb-6">
            Swap. Save. Invest.<br />
            <span className="text-brand-gold">Built for Africa.</span>
          </h1>
          <ul className="space-y-4 text-white/80 text-[16px]">
            <li className="flex items-center gap-3">
              <Zap size={20} className="text-brand-gold shrink-0" />
              Instant NGN deposits &amp; withdrawals
            </li>
            <li className="flex items-center gap-3">
              <ShieldCheck size={20} className="text-brand-gold shrink-0" />
              Seedless smart wallet — sign in with Google
            </li>
            <li className="flex items-center gap-3">
              <Lock size={20} className="text-brand-gold shrink-0" />
              AutoSave and earn yield on every swap
            </li>
          </ul>

          {/* Smart wallet explainer */}
          <div className="mt-8 p-4 bg-white/5 rounded-2xl border border-white/10">
            <p className="text-[13px] text-white/60 leading-relaxed">
              🔐 <span className="text-white font-semibold">No seed phrase, ever.</span> Your wallet is
              protected by your Google or Apple account using MPC key shards — the
              same technology used by top institutional custodians.
            </p>
          </div>
        </div>
      </div>

      {/* ── Login card ───────────────────────────────────────────────────── */}
      <div className="absolute inset-0 md:relative md:inset-auto md:flex-1 flex items-center justify-center p-4 z-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="bg-white rounded-[24px] shadow-2xl p-8 w-full max-w-[400px] flex flex-col items-center relative overflow-hidden"
        >
          {/* Mobile logo */}
          <div className="md:hidden flex items-baseline gap-1 mb-6">
            <span className="font-display font-bold text-[28px] text-brand-navy">Blin</span>
            <span className="font-body text-[28px] text-brand-accent">Finance</span>
          </div>
          <div className="w-full h-[1px] bg-border-light mb-6 md:hidden" />

          <AnimatePresence mode="wait">

            {/* ── Login buttons ───────────────────────────────────────── */}
            {!isLoggingIn && (
              <motion.div
                key="login-buttons"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="w-full flex flex-col items-center"
              >
                <h2 className="font-display font-semibold text-[26px] text-text-primary mb-1">
                  Welcome to Blin
                </h2>
                <p className="text-[14px] text-text-secondary text-center mb-2">
                  Sign in to access your smart wallet
                </p>

                {/* Smart wallet badge */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-green/10 text-brand-green text-[12px] font-semibold rounded-full mb-6">
                  <ShieldCheck size={14} />
                  Smart Wallet — No seed phrase required
                </div>

                {/* Error message */}
                {loginError && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full mb-4 p-3 bg-brand-red/5 border border-brand-red/20 rounded-xl text-[13px] text-brand-red text-center"
                  >
                    {loginError}
                  </motion.div>
                )}

                {/* Social login */}
                <div className="w-full space-y-3 mb-4">
                  {/* Google */}
                  <button
                    onClick={() => handleSocialLogin("google")}
                    className="group relative flex items-center justify-center w-full h-[56px] bg-white border-[1.5px] border-border-medium rounded-xl hover:bg-surface-raised hover:border-brand-accent transition-all duration-200 hover:shadow-sm"
                  >
                    <div className="absolute left-4"><GoogleSVG /></div>
                    <span className="font-semibold text-[15px] text-text-primary">Continue with Google</span>
                    <ArrowRight size={18} className="absolute right-4 text-text-muted group-hover:translate-x-1 transition-transform" />
                  </button>

                  {/* Apple */}
                  <button
                    onClick={() => handleSocialLogin("apple")}
                    className="group relative flex items-center justify-center w-full h-[56px] bg-black rounded-xl hover:bg-black/90 transition-all duration-200 hover:shadow-sm"
                  >
                    <div className="absolute left-4 text-white"><AppleSVG /></div>
                    <span className="font-semibold text-[15px] text-white">Continue with Apple</span>
                    <ArrowRight size={18} className="absolute right-4 text-white/50 group-hover:translate-x-1 transition-transform" />
                  </button>

                  {/* Email magic link */}
                  <button
                    onClick={handleEmailLogin}
                    className="group relative flex items-center justify-center w-full h-[56px] bg-surface-raised border-[1.5px] border-border-light rounded-xl hover:border-brand-accent transition-all duration-200"
                  >
                    <div className="absolute left-4 text-text-muted"><Mail size={20} /></div>
                    <span className="font-semibold text-[15px] text-text-secondary">Continue with Email</span>
                    <ArrowRight size={18} className="absolute right-4 text-text-muted group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-4 w-full my-4">
                  <div className="flex-1 h-[1px] bg-border-light" />
                  <span className="text-[12px] text-text-muted uppercase tracking-wider">or</span>
                  <div className="flex-1 h-[1px] bg-border-light" />
                </div>

                {/* EOA wallet connect */}
                <button
                  onClick={handleWalletLogin}
                  className="group relative flex items-center justify-center w-full h-[56px] bg-surface-raised border-[1.5px] border-border-medium rounded-xl hover:bg-white hover:border-brand-blue transition-all duration-200 mb-6"
                >
                  <div className="absolute left-4 text-brand-blue"><Wallet size={20} /></div>
                  <span className="font-semibold text-[15px] text-text-primary">Connect Existing Wallet</span>
                  <ArrowRight size={18} className="absolute right-4 text-text-muted group-hover:translate-x-1 transition-transform" />
                </button>

                {/* Trust badges */}
                <div className="flex justify-center gap-6 w-full text-[12px] text-text-secondary">
                  <div className="flex items-center gap-1"><Lock size={14} /> Non-custodial</div>
                  <div className="flex items-center gap-1"><ShieldCheck size={14} /> Audited</div>
                  <div className="flex items-center gap-1"><Zap size={14} /> Gasless txns</div>
                </div>
              </motion.div>
            )}

            {/* ── Loading / progress animation ────────────────────────── */}
            {isLoggingIn && (
              <motion.div
                key="loading"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full flex flex-col items-center py-4"
              >
                {/* Animated icon */}
                <div className="w-16 h-16 rounded-2xl bg-brand-blue/5 flex items-center justify-center mb-6 relative">
                  {loginType === "wallet"
                    ? <Wallet size={32} className="text-brand-blue relative z-10" />
                    : <ShieldCheck size={32} className="text-brand-blue relative z-10" />
                  }
                  <motion.div
                    className="absolute inset-0 border-2 border-brand-accent rounded-2xl"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    style={{ borderTopColor: "transparent", borderRightColor: "transparent" }}
                  />
                </div>

                <h2 className="font-display font-semibold text-[22px] text-text-primary mb-1">
                  {loginType === "wallet" ? "Wallet Connection" : "Creating Smart Wallet"}
                </h2>
                <p className="text-[14px] text-text-secondary text-center mb-8">
                  {loginType === "wallet"
                    ? "Connecting your external wallet securely"
                    : "Setting up your seedless, non-custodial wallet"
                  }
                </p>

                {/* Steps */}
                <div className="w-full space-y-4">
                  {activeSteps.map((step, index) => {
                    const isActive    = index === currentStepIndex;
                    const isCompleted = index <  currentStepIndex;
                    return (
                      <div key={step.id} className="flex items-center gap-3">
                        <div className="w-6 h-6 flex items-center justify-center shrink-0">
                          {isCompleted ? (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                              <CheckCircle2 size={20} className="text-brand-green" />
                            </motion.div>
                          ) : isActive ? (
                            <div className="w-4 h-4 rounded-full border-2 border-brand-accent border-t-transparent animate-spin" />
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-border-medium" />
                          )}
                        </div>
                        <span className={`text-[14px] font-medium transition-colors duration-300 ${
                          isCompleted ? "text-text-primary"
                          : isActive  ? "text-brand-accent"
                                      : "text-text-muted"
                        }`}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Cancel */}
                <button
                  onClick={() => {
                    setIsLoggingIn(false);
                    setCurrentStepIndex(-1);
                    setLoginType(null);
                  }}
                  className="mt-8 text-[13px] text-text-muted hover:text-text-secondary transition-colors"
                >
                  Cancel
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

// ─── SVG icons ────────────────────────────────────────────────────────────────

function GoogleSVG() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function AppleSVG() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.636 10.533c-.021-2.82 2.306-4.172 2.413-4.238-1.31-1.916-3.344-2.176-4.06-2.21-1.72-.173-3.36 1.014-4.238 1.014-.877 0-2.23-1.002-3.644-.974-1.84.026-3.538 1.07-4.488 2.716-1.92 3.328-.49 8.254 1.382 10.958.916 1.322 1.996 2.806 3.42 2.75 1.37-.056 1.892-.888 3.55-.888 1.656 0 2.128.888 3.55.86 1.474-.028 2.414-1.348 3.328-2.67.14-.196.27-.398.39-.606-1.35-.558-2.584-1.956-2.603-3.712zM15.42 4.26c.762-.92 1.274-2.2 1.134-3.48-1.096.044-2.428.73-3.21 1.64-.698.804-1.31 2.106-1.144 3.36 1.226.094 2.46-.62 3.22-1.52z"/>
    </svg>
  );
}
