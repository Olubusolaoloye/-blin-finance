import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Copy, Check, ChevronRight, CreditCard, Repeat, TrendingUp } from 'lucide-react';
import { BlinButton } from '../components/ui/BlinButton';
import { BlinCard } from '../components/ui/BlinCard';
import { mockUser } from '../lib/mockData';

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [copied, setCopied] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
  const [savePercent, setSavePercent] = useState(10);
  const [lockDuration, setLockDuration] = useState(3);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const nextStep = () => setStep(s => Math.min(s + 1, 3));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  return (
    <div className="min-h-screen flex flex-col font-body bg-surface-dark transition-colors duration-500" style={{ backgroundColor: step === 1 ? 'var(--surface-dark)' : 'white' }}>
      
      {/* Progress Dots */}
      <div className="pt-12 pb-6 flex justify-center gap-2 z-10">
        {[1, 2, 3].map(i => (
          <div 
            key={i} 
            className={`w-2 h-2 rounded-full transition-colors duration-300 ${i === step ? 'bg-brand-gold' : i < step ? 'bg-brand-gold/50' : 'bg-white/20 border border-white/10'}`}
          />
        ))}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-12 w-full max-w-md mx-auto relative">
        <AnimatePresence mode="wait">
          
          {/* STEP 1: Wallet Ready */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full flex flex-col items-center text-center"
            >
              <div className="relative mb-6">
                <div className="w-20 h-20 rounded-full bg-brand-blue flex items-center justify-center text-white font-display font-bold text-[28px] z-10 relative">
                  {mockUser.firstName[0]}{mockUser.lastName[0]}
                </div>
                <motion.div 
                  animate={{ scale: [1, 1.05, 1], opacity: [0.5, 0.8, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-[-4px] rounded-full border-2 border-brand-gold shadow-[0_0_0_6px_rgba(245,166,35,0.15)]"
                />
              </div>

              <h1 className="font-display font-semibold text-[28px] text-white mb-1">
                Welcome, {mockUser.firstName}! 👋
              </h1>
              <p className="text-[14px] text-white/60 mb-10">{mockUser.email}</p>

              <BlinCard variant="glass" className="w-full mb-8 border-white/20 bg-white/10">
                <div className="text-[12px] uppercase tracking-wider text-white/60 mb-2">Your Wallet Address</div>
                <div className="flex items-center justify-between bg-black/20 rounded-lg p-3 mb-4">
                  <span className="font-mono text-white text-[15px]">{mockUser.walletAddress}</span>
                  <button onClick={handleCopy} className="text-brand-gold p-1 hover:bg-white/10 rounded relative">
                    {copied ? <Check size={18} /> : <Copy size={18} />}
                    <AnimatePresence>
                      {copied && (
                        <motion.span 
                          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: -25 }} exit={{ opacity: 0 }}
                          className="absolute right-0 bg-white text-brand-navy text-[11px] px-2 py-1 rounded font-bold"
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

              <p className="text-[14px] text-white/80 mb-10">Same address on both chains. Share it to receive tokens.</p>

              <BlinButton variant="gold" className="w-full" onClick={nextStep}>
                Got it, let's go &rarr;
              </BlinButton>
            </motion.div>
          )}

          {/* STEP 2: AutoSave */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full flex flex-col items-center text-center"
            >
              <div className="w-32 h-32 mb-6 relative">
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
                  animate={{ y: [-20, 20], opacity: [0, 1, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeIn" }}
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-6 bg-brand-gold rounded-full border-2 border-white flex items-center justify-center text-white text-[10px] font-bold"
                >
                  $
                </motion.div>
              </div>

              <h2 className="font-display font-semibold text-[26px] text-text-primary mb-8">Save automatically, every swap</h2>

              <div className="w-full flex items-center justify-between bg-surface-raised p-4 rounded-2xl border border-border-light mb-6">
                <span className="font-bold text-[18px] text-text-primary">AutoSave</span>
                <button 
                  onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
                  className={`w-14 h-7 rounded-full p-1 transition-colors duration-300 ease-in-out ${autoSaveEnabled ? 'bg-brand-gold' : 'bg-border-medium'}`}
                >
                  <motion.div 
                    animate={{ x: autoSaveEnabled ? 28 : 0 }}
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
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="w-full overflow-hidden"
                  >
                    <div className="bg-white border border-border-light rounded-2xl p-6 mb-6">
                      <div className="flex justify-center items-baseline gap-1 mb-2">
                        <span className="font-display font-bold text-[64px] text-brand-gold leading-none">{savePercent}</span>
                        <span className="font-display font-bold text-[32px] text-brand-gold">%</span>
                      </div>
                      <div className="text-[14px] text-text-secondary mb-6">of every swap</div>
                      
                      <input 
                        type="range" 
                        min="1" max="50" 
                        value={savePercent} 
                        onChange={(e) => setSavePercent(e.target.value)}
                        className="w-full h-2 bg-border-light rounded-lg appearance-none cursor-pointer accent-brand-gold mb-8"
                      />

                      <div className="flex gap-2 mb-6">
                        {[1, 3, 6, 12].map(m => (
                          <button
                            key={m}
                            onClick={() => setLockDuration(m)}
                            className={`flex-1 py-2 rounded-lg text-[13px] font-semibold transition-colors ${lockDuration === m ? 'bg-brand-gold text-white' : 'border border-border-medium text-text-secondary'}`}
                          >
                            {m} {m === 1 ? 'Mo' : 'Mos'}
                          </button>
                        ))}
                      </div>

                      <div className="bg-brand-green/10 text-brand-green p-3 rounded-xl text-[13px] font-medium">
                        On a ₦50,000 swap, you'll save ₦{(50000 * (savePercent/100)).toLocaleString()} for {lockDuration} months, earning ~4.2% APY.
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="w-full flex flex-col gap-3 mt-auto">
                <BlinButton variant="gold" className="w-full" onClick={nextStep}>
                  {autoSaveEnabled ? 'Enable AutoSave &rarr;' : 'Continue &rarr;'}
                </BlinButton>
                <button onClick={nextStep} className="text-[14px] text-text-secondary font-medium py-2">
                  Skip for now
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: All Set */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full flex flex-col items-center text-center"
            >
              {/* Confetti */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {Array.from({ length: 30 }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ y: -50, x: '50%', opacity: 1, rotate: 0 }}
                    animate={{ 
                      y: window.innerHeight, 
                      x: `${Math.random() * 100}%`,
                      rotate: Math.random() * 360,
                      opacity: 0
                    }}
                    transition={{ duration: 2 + Math.random() * 2, ease: "easeOut" }}
                    className="absolute w-3 h-3 rounded-sm"
                    style={{ backgroundColor: ['#F5A623', '#00C896', '#2E86AB'][i % 3], left: `${Math.random() * 100}%` }}
                  />
                ))}
              </div>

              <div className="w-[72px] h-[72px] rounded-full bg-brand-green flex items-center justify-center mb-6 relative">
                <motion.svg 
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
                  width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12"></polyline>
                </motion.svg>
                <motion.div 
                  initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.8, type: "spring" }}
                  className="absolute inset-0 rounded-full border-2 border-brand-green"
                />
              </div>

              <h2 className="font-display font-semibold text-[28px] text-text-primary mb-2">Blin Finance is ready</h2>
              <p className="text-[15px] text-text-secondary mb-10">Start by adding funds or making your first swap.</p>

              <div className="w-full space-y-3 mb-10">
                {[
                  { icon: CreditCard, title: "Add NGN Funds", desc: "Deposit Naira via bank transfer", bg: "bg-brand-green/10", color: "text-brand-green" },
                  { icon: Repeat, title: "Make a Swap", desc: "Swap tokens on Ethereum or BSC", bg: "bg-brand-blue/10", color: "text-brand-blue" },
                  { icon: TrendingUp, title: "Explore Stocks", desc: "Invest in US and African stocks", bg: "bg-[#7C3AED]/10", color: "text-[#7C3AED]" }
                ].map((action, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 + (i * 0.1) }}
                  >
                    <BlinCard className="flex items-center p-4 cursor-pointer hover:bg-surface-raised">
                      <div className={`w-10 h-10 rounded-full ${action.bg} ${action.color} flex items-center justify-center mr-4 shrink-0`}>
                        <action.icon size={20} />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-bold text-[15px] text-text-primary">{action.title}</div>
                        <div className="text-[13px] text-text-secondary">{action.desc}</div>
                      </div>
                      <ChevronRight size={20} className="text-text-muted" />
                    </BlinCard>
                  </motion.div>
                ))}
              </div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} className="w-full">
                <BlinButton className="w-full" onClick={() => navigate('/dashboard')}>
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
