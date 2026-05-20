import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Lock, Search, ShieldCheck } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-surface-bg font-body selection:bg-brand-accent/30">
      {/* Navbar */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-surface-dark/80 backdrop-blur-[16px] border-b border-white/10 py-3' : 'bg-transparent py-5'}`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <div className="flex items-baseline gap-1">
            <span className="font-display font-bold text-[24px] text-white">Blin</span>
            <span className="font-body text-[24px] text-brand-accent">Finance</span>
          </div>
          <button 
            onClick={() => navigate('/login')}
            className="px-5 py-2 rounded-full border border-white/20 text-white text-[14px] font-semibold hover:bg-white/10 transition-colors"
          >
            Sign In &rarr;
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen bg-surface-dark flex flex-col justify-center items-center overflow-hidden pt-20">
        {/* Animated Orbs */}
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-brand-accent/15 blur-[80px] animate-[pulse_8s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-brand-gold/10 blur-[60px] animate-[pulse_10s_ease-in-out_infinite_reverse]" />
        
        {/* Noise overlay */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }} />

        <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-4xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="inline-flex items-center px-4 py-1.5 rounded-full border border-brand-gold/40 bg-brand-gold/10 text-brand-gold text-[13px] font-medium mb-8"
          >
            ✦ Built for Africa · Powered by DeFi
          </motion.div>

          <h1 className="font-display font-bold text-[56px] md:text-[80px] leading-[1.1] tracking-tight mb-6">
            <motion.span initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="block text-white">Your Money,</motion.span>
            <motion.span initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="block text-brand-gold">Borderless.</motion.span>
            <motion.span initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="block font-normal text-white">Starting with</motion.span>
            <motion.span initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="block text-brand-accent">the Naira.</motion.span>
          </h1>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="text-[17px] text-white/65 max-w-[480px] mb-10 leading-relaxed"
          >
            Swap tokens, save automatically, and move NGN in and out of crypto — directly from your phone. No bank account needed.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="flex flex-col items-center gap-4"
          >
            <button 
              onClick={() => navigate('/login')}
              className="flex items-center justify-center gap-3 w-[280px] h-[56px] bg-white text-brand-navy rounded-full font-semibold text-[16px] shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:scale-[1.02] transition-transform"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
            <div className="text-[13px] text-white/40 flex items-center gap-2">
              <span>Free</span><span>·</span><span>Non-custodial</span><span>·</span><span>No seed phrases</span>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 1 }}
            className="absolute bottom-10 text-brand-gold/50 animate-bounce"
          >
            <ChevronDown size={32} />
          </motion.div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-surface-dark border-t border-white/5 py-10">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-3 divide-x divide-white/10">
          <div className="text-center px-4">
            <div className="font-display font-bold text-[24px] md:text-[28px] text-white mb-1">4 Countries</div>
            <div className="text-[13px] text-white/50">NGN, GHC, KES, RAND</div>
          </div>
          <div className="text-center px-4">
            <div className="font-display font-bold text-[24px] md:text-[28px] text-white mb-1">2 Blockchains</div>
            <div className="text-[13px] text-white/50">Ethereum + BSC</div>
          </div>
          <div className="text-center px-4">
            <div className="font-display font-bold text-[24px] md:text-[28px] text-white mb-1">$0 Gas Fees</div>
            <div className="text-[13px] text-white/50">For new users</div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="text-[12px] uppercase tracking-widest text-brand-accent font-bold mb-3">What you can do</div>
            <h2 className="font-display font-semibold text-[32px] md:text-[40px] text-text-primary">Everything in one place</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: "Swap Any Token", desc: "Access deep liquidity on Ethereum and BSC via ParaSwap aggregator", icon: "🔄", bg: "from-brand-blue to-brand-accent" },
              { title: "AutoSave Every Swap", desc: "Set a % and we save it automatically. Earn Aave yield while locked.", icon: "🐷", bg: "from-brand-gold to-brand-gold-dark" },
              { title: "NGN In & Out", desc: "Deposit Naira via bank transfer, OPay, or MTN MoMo. Withdraw in minutes.", icon: "💵", bg: "from-brand-green to-[#00A87E]" },
              { title: "Invest in Stocks", desc: "Buy US and African stocks with your crypto. Portfolio in one place.", icon: "📈", bg: "from-[#7C3AED] to-[#5B21B6]" }
            ].map((feature, i) => (
              <div key={i} className="group p-6 rounded-2xl border border-border-light hover:shadow-lg hover:-translate-y-1 transition-all duration-300 bg-surface-card">
                <div className={`w-[52px] h-[52px] rounded-full bg-gradient-to-br ${feature.bg} flex items-center justify-center text-[24px] mb-6 shadow-md`}>
                  {feature.icon}
                </div>
                <h3 className="font-bold text-[16px] mb-2">{feature.title}</h3>
                <p className="text-[14px] text-text-secondary leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 bg-surface-raised">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-display font-semibold text-[32px] md:text-[40px] text-text-primary mb-3">Three steps. That's it.</h2>
            <p className="text-text-secondary text-[16px]">No crypto knowledge required.</p>
          </div>

          <div className="flex flex-col md:flex-row gap-8 relative">
            {/* Desktop connector line */}
            <div className="hidden md:block absolute top-[40px] left-[10%] right-[10%] h-[2px] border-t-2 border-dashed border-border-medium" />
            
            {[
              { step: "1", title: "Sign in with Google", desc: "No password. No seed phrase. Your Google account is enough." },
              { step: "2", title: "Add Naira", desc: "Deposit NGN via bank transfer or mobile money. Instant." },
              { step: "3", title: "Swap, Save, Invest", desc: "Your savings earn yield automatically. Stocks and crypto in one app." }
            ].map((item, i) => (
              <div key={i} className="flex-1 relative z-10 flex flex-col items-center text-center bg-white p-8 rounded-2xl shadow-sm border border-border-light">
                <div className="font-display font-bold text-[64px] text-brand-blue/15 leading-none mb-4">{item.step}</div>
                <h3 className="font-bold text-[18px] mb-2">{item.title}</h3>
                <p className="text-[14px] text-text-secondary">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="py-24 bg-surface-dark text-white">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="font-display font-semibold text-[32px] mb-12">Built to be trusted</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="flex flex-col items-center">
              <Lock size={32} className="text-brand-gold mb-4" />
              <h3 className="font-bold text-[18px] mb-2">Non-custodial</h3>
              <p className="text-white/60 text-[14px]">We never hold your keys</p>
            </div>
            <div className="flex flex-col items-center">
              <Search size={32} className="text-brand-gold mb-4" />
              <h3 className="font-bold text-[18px] mb-2">Transparent</h3>
              <p className="text-white/60 text-[14px]">Every yield source explained</p>
            </div>
            <div className="flex flex-col items-center">
              <ShieldCheck size={32} className="text-brand-gold mb-4" />
              <h3 className="font-bold text-[18px] mb-2">Audited</h3>
              <p className="text-white/60 text-[14px]">Smart contracts independently reviewed</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#081524] py-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-baseline gap-1">
            <span className="font-display font-bold text-[20px] text-white">Blin</span>
            <span className="font-body text-[20px] text-brand-accent">Finance</span>
          </div>
          <div className="flex gap-6 text-[13px] text-white/60">
            <a href="#" className="hover:text-white transition-colors">Whitepaper</a>
            <a href="#" className="hover:text-white transition-colors">Docs</a>
            <a href="#" className="hover:text-white transition-colors">Twitter</a>
            <a href="#" className="hover:text-white transition-colors">GitHub</a>
          </div>
          <div className="text-[12px] text-white/40 text-center md:text-right">
            © 2026 Blin Finance · Not financial advice · DeFi involves risk
          </div>
        </div>
      </footer>
    </div>
  );
}
