"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { Copy, Check, ChevronRight, CreditCard, Repeat, TrendingUp, User, Mail, ArrowRight, Wallet } from "lucide-react";
import { BlinButton } from "@/components/ui/BlinButton";
import { BlinCard } from "@/components/ui/BlinCard";
import { useAuth } from "@/hooks/useAuth";
import { useUserStore } from "@/store/userStore";
import { useProfile } from "@/hooks/useProfile";

const TOTAL_STEPS = 4;

export default function Onboarding() {
  const router = useRouter();
  const { address, shortAddress, isConnected, isConnecting } = useAuth();
  const { setProfile, completeOnboarding, displayName, email, autoSaveEnabled, savePercent, lockDuration, hasCompletedOnboarding } = useUserStore();

  const { saveToDb } = useProfile();

  const [step, setStep]         = useState(1);
  const [copied, setCopied]     = useState(false);
  const [nameInput, setNameInput] = useState(displayName);
  const [emailInput, setEmailInput] = useState(email);
  const [nameError, setNameError]   = useState("");

  // If user already completed onboarding and is connected, skip to dashboard
  useEffect(() => {
    if (!isConnecting && isConnected && hasCompletedOnboarding) {
      router.replace("/dashboard");
    }
  }, [isConnected, isConnecting, hasCompletedOnboarding, router]);

  const handleCopy = () => {
    if (address) navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const goNext = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));

  const handleProfileNext = () => {
    if (!nameInput.trim()) {
      setNameError("Please enter your name");
      return;
    }
    setNameError("");
    setProfile({ displayName: nameInput.trim(), email: emailInput.trim() });
    goNext();
  };

  const handleAutoSaveNext = () => {
    setProfile({ autoSaveEnabled, savePercent, lockDuration });
    goNext();
  };

  const handleDone = async (destination: string) => {
    completeOnboarding();           // mark done in local store first (instant)
    await saveToDb();               // then persist everything to Supabase
    router.replace(destination);
  };

  // Derive initials from name input (live preview)
  const initials = nameInput.trim()
    ? nameInput.trim().split(" ").map((w) => w[0]).join("").substring(0, 2).toUpperCase()
    : address
    ? address.slice(2, 4).toUpperCase()
    : "?";

  // ----- UI helpers -----

  const bgStyle: React.CSSProperties = {
    backgroundColor: step === 2 ? "var(--surface-dark)" : "white",
  };

  return (
    <div
      className="min-h-screen flex flex-col font-body transition-colors duration-500"
      style={bgStyle}
    >
      {/* Progress bar */}
      <div className="w-full h-1 bg-black/10 fixed top-0 left-0 z-50">
        <motion.div
          className="h-full bg-brand-gold"
          animate={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
        />
      </div>

      {/* Step counter */}
      <div className={`pt-8 pb-2 flex justify-center gap-2 z-10 ${step === 2 ? "text-white/40" : "text-text-muted"}`}>
        <span className="text-[12px] font-semibold tracking-wider uppercase">
          Step {step} of {TOTAL_STEPS}
        </span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-12 w-full max-w-md mx-auto relative">
        <AnimatePresence mode="wait">

          {/* ── STEP 1: Profile Setup ── */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              className="w-full flex flex-col items-center"
            >
              {/* Avatar preview */}
              <div className="relative mb-6">
                <motion.div
                  className="w-20 h-20 rounded-full bg-brand-blue flex items-center justify-center text-white font-display font-bold text-[26px] z-10 relative"
                  animate={{ scale: [1, 1.04, 1] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                >
                  {initials}
                </motion.div>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-[-6px] rounded-full border-2 border-dashed border-brand-gold/50"
                />
              </div>

              <h1 className="font-display font-semibold text-[26px] text-text-primary mb-1 text-center">
                What should we call you?
              </h1>
              <p className="text-[14px] text-text-secondary text-center mb-8">
                This appears on your profile and in the app.
              </p>

              <div className="w-full space-y-4">
                {/* Name */}
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">
                    <User size={18} />
                  </div>
                  <input
                    type="text"
                    placeholder="Display name  e.g. Ada Obi"
                    value={nameInput}
                    onChange={(e) => { setNameInput(e.target.value); setNameError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && handleProfileNext()}
                    className={`w-full h-14 pl-11 pr-4 bg-surface-raised border-2 rounded-xl font-body text-[15px] outline-none transition-colors ${
                      nameError ? "border-brand-red" : "border-border-light focus:border-brand-accent"
                    }`}
                  />
                  {nameError && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-brand-red text-[12px] mt-1 ml-1"
                    >
                      {nameError}
                    </motion.p>
                  )}
                </div>

                {/* Email (optional) */}
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">
                    <Mail size={18} />
                  </div>
                  <input
                    type="email"
                    placeholder="Email (optional — for alerts)"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleProfileNext()}
                    className="w-full h-14 pl-11 pr-4 bg-surface-raised border-2 border-border-light rounded-xl font-body text-[15px] outline-none focus:border-brand-accent transition-colors"
                  />
                </div>
              </div>

              {/* Connect wallet notice if not connected */}
              {!isConnected && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full mt-4 bg-brand-blue/5 border border-brand-blue/20 rounded-xl p-3 flex items-center gap-3"
                >
                  <Wallet size={16} className="text-brand-blue shrink-0" />
                  <p className="text-[12px] text-text-secondary">
                    Your smart wallet is being activated — your address will appear on the next step.
                  </p>
                </motion.div>
              )}

              <BlinButton
                variant="gold"
                className="w-full mt-8"
                onClick={handleProfileNext}
              >
                Continue <ArrowRight size={16} className="ml-1" />
              </BlinButton>
            </motion.div>
          )}

          {/* ── STEP 2: Wallet Address ── */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              className="w-full flex flex-col items-center text-center"
            >
              <div className="relative mb-6">
                <div className="w-20 h-20 rounded-full bg-brand-blue flex items-center justify-center text-white font-display font-bold text-[26px] z-10 relative">
                  {initials}
                </div>
                <motion.div
                  animate={{ scale: [1, 1.05, 1], opacity: [0.5, 0.8, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-[-4px] rounded-full border-2 border-brand-gold shadow-[0_0_0_6px_rgba(245,166,35,0.15)]"
                />
              </div>

              <h1 className="font-display font-semibold text-[28px] text-white mb-1">
                Welcome, {nameInput.trim() || "there"}! 👋
              </h1>
              <p className="text-[14px] text-white/60 mb-8">Your wallet is set up and ready to go.</p>

              {isConnected ? (
                <BlinCard variant="glass" className="w-full mb-6 border-white/20 bg-white/10">
                  <div className="text-[12px] uppercase tracking-wider text-white/60 mb-2">Your Wallet Address</div>
                  <div className="flex items-center justify-between bg-black/20 rounded-lg p-3 mb-4">
                    <span className="font-mono text-white text-[13px] break-all leading-relaxed">
                      {address ?? shortAddress}
                    </span>
                    <button
                      onClick={handleCopy}
                      className="text-brand-gold p-1 hover:bg-white/10 rounded ml-2 relative shrink-0"
                    >
                      {copied ? <Check size={18} /> : <Copy size={18} />}
                      <AnimatePresence>
                        {copied && (
                          <motion.span
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: -24 }}
                            exit={{ opacity: 0 }}
                            className="absolute right-0 bg-white text-brand-navy text-[11px] px-2 py-1 rounded font-bold whitespace-nowrap"
                          >
                            Copied!
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </button>
                  </div>
                  <div className="flex gap-2 justify-center">
                    <span className="px-3 py-1 bg-brand-green/20 text-brand-green text-[12px] font-semibold rounded-full">Ethereum</span>
                    <span className="px-3 py-1 bg-[#F3BA2F]/20 text-[#F3BA2F] text-[12px] font-semibold rounded-full">BSC</span>
                  </div>
                </BlinCard>
              ) : (
                <div className="w-full mb-6 bg-white/10 border border-white/20 rounded-2xl p-5 flex flex-col items-center gap-3">
                  <div className="w-10 h-10 rounded-full border-4 border-brand-gold/30 border-t-brand-gold animate-spin" />
                  <p className="text-white/70 text-[14px]">Activating your smart wallet…</p>
                  <p className="text-white/40 text-[12px] text-center">This takes just a moment after login</p>
                </div>
              )}

              <p className="text-[13px] text-white/70 mb-8">Same address on Ethereum & BSC. Share it to receive tokens.</p>

              <BlinButton variant="gold" className="w-full" onClick={goNext}>
                Got it, let&apos;s go &rarr;
              </BlinButton>
            </motion.div>
          )}

          {/* ── STEP 3: AutoSave ── */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              className="w-full flex flex-col items-center text-center"
            >
              {/* Piggy bank animation */}
              <div className="w-28 h-28 mb-4 relative">
                <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_10px_20px_rgba(245,166,35,0.3)]">
                  <path d="M80 50C80 66.5685 66.5685 80 50 80C33.4315 80 20 66.5685 20 50C20 33.4315 33.4315 20 50 20C66.5685 20 80 33.4315 80 50Z" fill="#F5A623"/>
                  <path d="M70 45C70 45 75 40 80 45C85 50 80 60 75 60" stroke="#F5A623" strokeWidth="6" strokeLinecap="round"/>
                  <circle cx="35" cy="45" r="4" fill="#0D2137"/>
                  <path d="M30 25C30 25 35 15 45 20" stroke="#F5A623" strokeWidth="6" strokeLinecap="round"/>
                  <path d="M60 20C60 20 65 10 75 15" stroke="#F5A623" strokeWidth="6" strokeLinecap="round"/>
                  <path d="M35 80L30 90" stroke="#F5A623" strokeWidth="8" strokeLinecap="round"/>
                  <path d="M65 80L70 90" stroke="#F5A623" strokeWidth="8" strokeLinecap="round"/>
                  <rect x="40" y="20" width="20" height="6" rx="3" fill="#D4891A"/>
                </svg>
                <motion.div
                  animate={{ y: [-18, 18], opacity: [0, 1, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeIn" }}
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-6 bg-brand-gold rounded-full border-2 border-white flex items-center justify-center text-white text-[10px] font-bold"
                >
                  $
                </motion.div>
              </div>

              <h2 className="font-display font-semibold text-[24px] text-text-primary mb-2">Save on every swap</h2>
              <p className="text-[14px] text-text-secondary mb-6">AutoSave sets aside a slice of each swap — automatically.</p>

              {/* Toggle */}
              <div className="w-full flex items-center justify-between bg-surface-raised p-4 rounded-2xl border border-border-light mb-4">
                <div>
                  <span className="font-bold text-[16px] text-text-primary">AutoSave</span>
                  <p className="text-[12px] text-text-muted mt-0.5">Earn ~4.2% APY on your savings</p>
                </div>
                <button
                  onClick={() => setProfile({ autoSaveEnabled: !autoSaveEnabled })}
                  className={`w-14 h-7 rounded-full p-1 transition-colors duration-300 ${autoSaveEnabled ? "bg-brand-gold" : "bg-border-medium"}`}
                >
                  <motion.div
                    animate={{ x: autoSaveEnabled ? 28 : 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="w-5 h-5 bg-white rounded-full shadow-sm flex items-center justify-center"
                  >
                    {autoSaveEnabled && <span className="text-brand-gold text-[10px]">✨</span>}
                  </motion.div>
                </button>
              </div>

              <AnimatePresence>
                {autoSaveEnabled && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 25 }}
                    className="w-full overflow-hidden"
                  >
                    <div className="bg-white border border-border-light rounded-2xl p-5 mb-4">
                      <div className="flex justify-center items-baseline gap-1 mb-1">
                        <span className="font-display font-bold text-[56px] text-brand-gold leading-none">{savePercent}</span>
                        <span className="font-display font-bold text-[28px] text-brand-gold">%</span>
                      </div>
                      <p className="text-[13px] text-text-secondary mb-4">saved from every swap</p>

                      <input
                        type="range" min="1" max="50"
                        value={savePercent}
                        onChange={(e) => setProfile({ savePercent: Number(e.target.value) })}
                        className="w-full h-2 bg-border-light rounded-lg appearance-none cursor-pointer accent-brand-gold mb-6"
                      />

                      <div className="flex gap-2 mb-4">
                        {[1, 3, 6, 12].map((m) => (
                          <button
                            key={m}
                            onClick={() => setProfile({ lockDuration: m })}
                            className={`flex-1 py-2 rounded-lg text-[13px] font-semibold transition-all ${lockDuration === m ? "bg-brand-gold text-white shadow-sm" : "border border-border-medium text-text-secondary hover:border-brand-gold"}`}
                          >
                            {m}{m === 1 ? " Mo" : " Mos"}
                          </button>
                        ))}
                      </div>

                      <div className="bg-brand-green/10 text-brand-green p-3 rounded-xl text-[13px] font-medium">
                        On a ₦50,000 swap → save ₦{(50000 * savePercent / 100).toLocaleString()} for {lockDuration} mo, earning ~4.2% APY
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="w-full flex flex-col gap-3 mt-2">
                <BlinButton variant="gold" className="w-full" onClick={handleAutoSaveNext}>
                  {autoSaveEnabled ? "Enable AutoSave →" : "Continue →"}
                </BlinButton>
                <button onClick={goNext} className="text-[14px] text-text-secondary font-medium py-2 hover:text-text-primary transition-colors">
                  Skip for now
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 4: All Set ── */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 22 }}
              className="w-full flex flex-col items-center text-center"
            >
              {/* Confetti */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {Array.from({ length: 36 }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ y: -20, x: `${Math.random() * 100}%`, opacity: 1, rotate: 0, scale: 1 }}
                    animate={{ y: 900, rotate: Math.random() * 720 - 360, opacity: 0, scale: 0.5 }}
                    transition={{ duration: 2.2 + Math.random() * 1.5, ease: "easeOut", delay: Math.random() * 0.4 }}
                    className="absolute w-3 h-3 rounded-sm"
                    style={{ backgroundColor: ["#F5A623", "#00C896", "#2E86AB", "#FF6B6B", "#A855F7"][i % 5] }}
                  />
                ))}
              </div>

              <div className="w-20 h-20 rounded-full bg-brand-green flex items-center justify-center mb-6 relative">
                <motion.svg
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
                  width="32" height="32" viewBox="0 0 24 24" fill="none"
                  stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </motion.svg>
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1.15, opacity: 0 }}
                  transition={{ delay: 0.6, duration: 0.6 }}
                  className="absolute inset-0 rounded-full bg-brand-green"
                />
              </div>

              <motion.h2
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="font-display font-semibold text-[28px] text-text-primary mb-2"
              >
                You&apos;re all set{nameInput.trim() ? `, ${nameInput.trim().split(" ")[0]}` : ""}! 🎉
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-[15px] text-text-secondary mb-8"
              >
                Blin Finance is ready. Where do you want to start?
              </motion.p>

              <div className="w-full space-y-3 mb-8">
                {[
                  { icon: CreditCard, title: "Add NGN Funds",   desc: "Deposit Naira via bank transfer",  path: "/fiat",    bg: "bg-brand-green/10", color: "text-brand-green"  },
                  { icon: Repeat,     title: "Make a Swap",     desc: "Swap tokens on Ethereum or BSC",  path: "/swap",    bg: "bg-brand-blue/10",  color: "text-brand-blue"   },
                  { icon: TrendingUp, title: "Explore Stocks",  desc: "Invest in US and African stocks", path: "/stocks",  bg: "bg-[#7C3AED]/10",   color: "text-[#7C3AED]"    },
                ].map((action, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                  >
                    <button
                      onClick={() => handleDone(action.path)}
                      className="w-full flex items-center p-4 bg-white rounded-2xl border border-border-light hover:bg-surface-raised hover:shadow-sm transition-all text-left"
                    >
                      <div className={`w-10 h-10 rounded-full ${action.bg} ${action.color} flex items-center justify-center mr-4 shrink-0`}>
                        <action.icon size={20} />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-[15px] text-text-primary">{action.title}</div>
                        <div className="text-[13px] text-text-secondary">{action.desc}</div>
                      </div>
                      <ChevronRight size={18} className="text-text-muted" />
                    </button>
                  </motion.div>
                ))}
              </div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="w-full">
                <BlinButton className="w-full" onClick={() => handleDone("/dashboard")}>
                  Go to Dashboard &rarr;
                </BlinButton>
              </motion.div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
