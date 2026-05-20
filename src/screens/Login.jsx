import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Zap, Lock, CheckCircle2, Wallet } from 'lucide-react';

const ZK_STEPS = [
  { id: 'auth', label: 'Authenticating with provider...' },
  { id: 'ephemeral', label: 'Generating ephemeral keypair...' },
  { id: 'proof', label: 'Fetching Zero-Knowledge proof...' },
  { id: 'derive', label: 'Deriving non-custodial wallet...' },
];

const WEB3_STEPS = [
  { id: 'init', label: 'Initializing Web3 provider...' },
  { id: 'request', label: 'Requesting wallet connection...' },
  { id: 'sign', label: 'Verifying signature...' },
  { id: 'auth', label: 'Authenticating session...' },
];

export default function Login() {
  const navigate = useNavigate();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginType, setLoginType] = useState(null); // 'zk' or 'web3'
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);

  const handleZkLogin = (provider) => {
    setLoginType('zk');
    setIsLoggingIn(true);
    setCurrentStepIndex(0);

    // Simulate the zkLogin flow steps
    const stepDuration = 800;
    
    ZK_STEPS.forEach((_, index) => {
      setTimeout(() => {
        setCurrentStepIndex(index);
      }, index * stepDuration);
    });

    // Finish and navigate
    setTimeout(() => {
      navigate('/onboarding');
    }, ZK_STEPS.length * stepDuration + 500);
  };

  const handleWalletConnect = () => {
    setLoginType('web3');
    setIsLoggingIn(true);
    setCurrentStepIndex(0);

    // Simulate the Web3 connection flow steps
    const stepDuration = 800;
    
    WEB3_STEPS.forEach((_, index) => {
      setTimeout(() => {
        setCurrentStepIndex(index);
      }, index * stepDuration);
    });

    // Finish and navigate
    setTimeout(() => {
      navigate('/onboarding');
    }, WEB3_STEPS.length * stepDuration + 500);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-surface-dark font-body">
      {/* Animated Background for Mobile / Left side for Desktop */}
      <div className="relative flex-1 flex flex-col justify-center items-center p-8 overflow-hidden bg-gradient-to-br from-[#0D2137] to-[#1A3C6E]">
        {/* Particles */}
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: Math.random() * 4 + 2 + 'px',
              height: Math.random() * 4 + 2 + 'px',
              backgroundColor: Math.random() > 0.5 ? 'var(--brand-gold)' : 'white',
              left: Math.random() * 100 + '%',
              top: Math.random() * 100 + '%',
              opacity: Math.random() * 0.3 + 0.2,
            }}
            animate={{
              y: [0, -100],
              opacity: [0, 0.5, 0],
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}

        <div className="relative z-10 text-center md:text-left max-w-md w-full hidden md:block">
          <div className="flex items-baseline gap-1 mb-6">
            <span className="font-display font-bold text-[40px] text-white">Blin</span>
            <span className="font-body text-[40px] text-brand-accent">Finance</span>
          </div>
          <h1 className="font-display font-bold text-[48px] text-white leading-[1.1] mb-6">
            Swap. Save. Invest.<br/>
            <span className="text-brand-gold">Built for Africa.</span>
          </h1>
          <ul className="space-y-4 text-white/80 text-[16px]">
            <li className="flex items-center gap-3"><Zap size={20} className="text-brand-gold" /> Instant NGN deposits & withdrawals</li>
            <li className="flex items-center gap-3"><ShieldCheck size={20} className="text-brand-gold" /> zkLogin: Seedless, non-custodial</li>
            <li className="flex items-center gap-3"><Lock size={20} className="text-brand-gold" /> AutoSave and earn yield on every swap</li>
          </ul>
        </div>
      </div>

      {/* Login Card Area */}
      <div className="absolute inset-0 md:relative md:inset-auto md:flex-1 flex items-center justify-center p-4 z-20">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="bg-white rounded-[24px] shadow-2xl p-8 w-full max-w-[400px] flex flex-col items-center relative overflow-hidden"
        >
          <div className="md:hidden flex items-baseline gap-1 mb-8">
            <span className="font-display font-bold text-[28px] text-brand-navy">Blin</span>
            <span className="font-body text-[28px] text-brand-accent">Finance</span>
          </div>

          <div className="w-full h-[1px] bg-border-light mb-8 md:hidden" />

          <AnimatePresence mode="wait">
            {!isLoggingIn ? (
              <motion.div 
                key="login-buttons"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="w-full flex flex-col items-center"
              >
                <h2 className="font-display font-semibold text-[26px] text-text-primary mb-2">Welcome back</h2>
                <p className="text-[14px] text-text-secondary text-center mb-8">Sign in with zkLogin to access your wallet</p>

                <div className="w-full space-y-3">
                  <button
                    onClick={() => handleZkLogin('google')}
                    className="group relative flex items-center justify-center w-full h-[56px] bg-white border-[1.5px] border-border-medium rounded-xl hover:bg-surface-raised hover:border-brand-accent transition-all duration-200"
                  >
                    <div className="absolute left-4">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                    </div>
                    <span className="font-semibold text-[15px] text-text-primary">Continue with Google</span>
                    <ArrowRight size={18} className="absolute right-4 text-text-muted group-hover:translate-x-1 transition-transform" />
                  </button>

                  <button
                    onClick={() => handleZkLogin('apple')}
                    className="group relative flex items-center justify-center w-full h-[56px] bg-black rounded-xl hover:bg-black/90 transition-all duration-200"
                  >
                    <div className="absolute left-4 text-white">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <path d="M16.636 10.533c-.021-2.82 2.306-4.172 2.413-4.238-1.31-1.916-3.344-2.176-4.06-2.21-1.72-.173-3.36 1.014-4.238 1.014-.877 0-2.23-1.002-3.644-.974-1.84.026-3.538 1.07-4.488 2.716-1.92 3.328-.49 8.254 1.382 10.958.916 1.322 1.996 2.806 3.42 2.75 1.37-.056 1.892-.888 3.55-.888 1.656 0 2.128.888 3.55.86 1.474-.028 2.414-1.348 3.328-2.67.14-.196.27-.398.39-.606-1.35-.558-2.584-1.956-2.603-3.712zM15.42 4.26c.762-.92 1.274-2.2 1.134-3.48-1.096.044-2.428.73-3.21 1.64-.698.804-1.31 2.106-1.144 3.36 1.226.094 2.46-.62 3.22-1.52z"/>
                      </svg>
                    </div>
                    <span className="font-semibold text-[15px] text-white">Continue with Apple</span>
                    <ArrowRight size={18} className="absolute right-4 text-white/50 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>

                <div className="flex items-center gap-4 w-full my-6">
                  <div className="flex-1 h-[1px] bg-border-light" />
                  <span className="text-[12px] text-text-muted uppercase tracking-wider">Web3</span>
                  <div className="flex-1 h-[1px] bg-border-light" />
                </div>

                <button
                  onClick={handleWalletConnect}
                  className="group relative flex items-center justify-center w-full h-[56px] bg-surface-raised border-[1.5px] border-border-medium rounded-xl hover:bg-white hover:border-brand-blue transition-all duration-200 mb-8"
                >
                  <div className="absolute left-4 text-brand-blue">
                    <Wallet size={20} />
                  </div>
                  <span className="font-semibold text-[15px] text-text-primary">Connect Wallet</span>
                  <ArrowRight size={18} className="absolute right-4 text-text-muted group-hover:translate-x-1 transition-transform" />
                </button>

                <div className="text-[14px] text-text-secondary mb-8">
                  New to Blin Finance? <a href="#" className="text-brand-accent font-semibold hover:underline">Learn more &rarr;</a>
                </div>

                <div className="flex justify-center gap-6 w-full text-[12px] text-text-secondary">
                  <div className="flex items-center gap-1"><Lock size={14} /> Non-custodial</div>
                  <div className="flex items-center gap-1"><ShieldCheck size={14} /> Audited</div>
                  <div className="flex items-center gap-1"><Zap size={14} /> Gasless</div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="zk-loading"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full flex flex-col items-center py-4"
              >
                <div className="w-16 h-16 rounded-2xl bg-brand-blue/5 flex items-center justify-center mb-6 relative">
                  {loginType === 'web3' ? (
                    <Wallet size={32} className="text-brand-blue relative z-10" />
                  ) : (
                    <ShieldCheck size={32} className="text-brand-blue relative z-10" />
                  )}
                  <motion.div 
                    className="absolute inset-0 border-2 border-brand-accent rounded-2xl"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    style={{ borderTopColor: 'transparent', borderRightColor: 'transparent' }}
                  />
                </div>
                
                <h2 className="font-display font-semibold text-[22px] text-text-primary mb-2">
                  {loginType === 'web3' ? 'Wallet Connection' : 'zkLogin Authentication'}
                </h2>
                <p className="text-[14px] text-text-secondary text-center mb-8">
                  {loginType === 'web3' ? 'Securely connecting your Web3 wallet' : 'Securing your non-custodial wallet'}
                </p>

                <div className="w-full space-y-4">
                  {(loginType === 'web3' ? WEB3_STEPS : ZK_STEPS).map((step, index) => {
                    const isActive = index === currentStepIndex;
                    const isCompleted = index < currentStepIndex;
                    const isPending = index > currentStepIndex;

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
                          isCompleted ? 'text-text-primary' : 
                          isActive ? 'text-brand-accent' : 
                          'text-text-muted'
                        }`}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
