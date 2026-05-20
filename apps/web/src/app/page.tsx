import { Lock, Search, ShieldCheck, Zap, PiggyBank, TrendingUp, Repeat, Banknote, ChevronDown } from "lucide-react";
import { LandingNav } from "@/components/landing/LandingNav";
import { HeroCTA } from "@/components/landing/HeroCTA";
import { AppMockup } from "@/components/landing/AppMockup";

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#0D2137] font-body selection:bg-[#2E86AB]/30 overflow-x-hidden">
      <LandingNav />

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center overflow-hidden pt-20">
        {/* Background orbs */}
        <div className="absolute top-[-15%] left-[-10%] w-[700px] h-[700px] rounded-full bg-[#2E86AB]/12 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-[#F5A623]/8 blur-[100px] pointer-events-none" />
        <div className="absolute top-[30%] right-[20%] w-[300px] h-[300px] rounded-full bg-[#1A3C6E]/40 blur-[80px] pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 w-full py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* Left — copy */}
            <div>
              <div className="inline-flex items-center px-4 py-1.5 rounded-full border border-[#F5A623]/40 bg-[#F5A623]/10 text-[#F5A623] text-[13px] font-semibold mb-8">
                ✦ Built for Africa · Powered by DeFi
              </div>

              <h1 className="font-display font-bold text-[52px] md:text-[68px] leading-[1.05] tracking-tight mb-6">
                <span className="block text-white">Your Money,</span>
                <span className="block text-[#F5A623]">Borderless.</span>
                <span className="block text-white/80 font-normal text-[44px] md:text-[56px] mt-1">Starting with</span>
                <span className="block text-[#2E86AB]">the Naira.</span>
              </h1>

              <p className="text-[17px] text-white/60 max-w-[460px] leading-relaxed mb-4">
                Swap tokens, save automatically, and move NGN in and out of crypto — all from your phone. No bank account needed.
              </p>

              <div className="flex flex-wrap gap-3 text-[13px] text-white/40 mb-2">
                <span className="flex items-center gap-1.5"><Zap size={13} className="text-[#F5A623]" /> Instant NGN deposits</span>
                <span className="flex items-center gap-1.5"><PiggyBank size={13} className="text-[#00C896]" /> AutoSave every swap</span>
                <span className="flex items-center gap-1.5"><ShieldCheck size={13} className="text-[#2E86AB]" /> Non-custodial</span>
              </div>

              <HeroCTA />

              <p className="text-[12px] text-white/30 mt-4">
                Free · No seed phrases · Your keys, your coins
              </p>
            </div>

            {/* Right — app mockup */}
            <div className="flex justify-center lg:justify-end">
              <AppMockup />
            </div>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/30 animate-bounce">
          <ChevronDown size={28} />
        </div>
      </section>

      {/* ── STATS TICKER ── */}
      <section className="bg-white/5 border-y border-white/10 py-6">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 divide-x divide-white/10">
          {[
            { value: "4",       label: "African Currencies",   sub: "NGN · GHS · KES · ZAR" },
            { value: "2",       label: "Blockchains",          sub: "Ethereum + BNB Chain"   },
            { value: "$0",      label: "Gas Fees",             sub: "For new users"          },
            { value: "4.2%",    label: "AutoSave APY",         sub: "Powered by Aave"        },
          ].map((s, i) => (
            <div key={i} className="text-center px-4">
              <div className="font-display font-bold text-[26px] md:text-[30px] text-white">{s.value}</div>
              <div className="text-[13px] font-semibold text-white/70 mt-0.5">{s.label}</div>
              <div className="text-[11px] text-white/35 mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-28 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="text-[12px] uppercase tracking-widest text-[#2E86AB] font-bold mb-3">What you can do</div>
            <h2 className="font-display font-semibold text-[36px] md:text-[44px] text-[#0D2137]">
              Everything in one place
            </h2>
            <p className="text-[16px] text-gray-500 mt-3 max-w-[460px] mx-auto">
              Blin Finance combines DeFi, savings, stocks, and fiat on-ramp into a single seamless experience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                Icon: Repeat,
                title: "Swap Any Token",
                desc: "Best-price token swaps across Ethereum and BNB Chain via ParaSwap aggregator.",
                gradient: "from-[#1A3C6E] to-[#2E86AB]",
                glow: "shadow-[0_8px_32px_rgba(46,134,171,0.25)]",
              },
              {
                Icon: PiggyBank,
                title: "AutoSave Every Swap",
                desc: "Set aside a % of every swap automatically. Your savings earn 4.2% APY via Aave.",
                gradient: "from-[#D4891A] to-[#F5A623]",
                glow: "shadow-[0_8px_32px_rgba(245,166,35,0.25)]",
              },
              {
                Icon: Banknote,
                title: "NGN In & Out",
                desc: "Deposit Naira via bank transfer, OPay, or MTN MoMo. Withdraw in minutes.",
                gradient: "from-[#00A87E] to-[#00C896]",
                glow: "shadow-[0_8px_32px_rgba(0,200,150,0.25)]",
              },
              {
                Icon: TrendingUp,
                title: "Invest in Stocks",
                desc: "Buy fractional US and African stocks with your crypto. Portfolio in one place.",
                gradient: "from-[#5B21B6] to-[#7C3AED]",
                glow: "shadow-[0_8px_32px_rgba(124,58,237,0.25)]",
              },
            ].map(({ Icon, title, desc, gradient, glow }, i) => (
              <div
                key={i}
                className="group p-7 rounded-3xl border border-gray-100 hover:-translate-y-2 hover:shadow-xl transition-all duration-300 bg-white"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} ${glow} flex items-center justify-center mb-6`}>
                  <Icon size={26} className="text-white" />
                </div>
                <h3 className="font-bold text-[17px] text-[#0D2137] mb-2">{title}</h3>
                <p className="text-[14px] text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-28 bg-[#F8FAFC]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-display font-semibold text-[36px] md:text-[44px] text-[#0D2137] mb-3">
              Three steps. That&apos;s it.
            </h2>
            <p className="text-[16px] text-gray-500">No crypto knowledge required.</p>
          </div>

          <div className="flex flex-col md:flex-row gap-6 relative">
            {/* connector line */}
            <div className="hidden md:block absolute top-[52px] left-[calc(16.66%+20px)] right-[calc(16.66%+20px)] h-[2px] border-t-2 border-dashed border-gray-200" />

            {[
              {
                n: "01",
                title: "Sign in",
                desc: "Use Google (zkLogin) or connect your existing wallet. No passwords, no seed phrases.",
                color: "bg-[#2E86AB]",
              },
              {
                n: "02",
                title: "Add Naira",
                desc: "Deposit NGN instantly via bank transfer, OPay, or MTN MoMo. Converts to USDT automatically.",
                color: "bg-[#F5A623]",
              },
              {
                n: "03",
                title: "Swap, Save, Grow",
                desc: "Swap tokens, set AutoSave, buy stocks. Your savings earn Aave yield while you sleep.",
                color: "bg-[#00C896]",
              },
            ].map((step, i) => (
              <div key={i} className="flex-1 relative z-10 flex flex-col items-center text-center bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                <div className={`w-12 h-12 ${step.color} rounded-2xl flex items-center justify-center text-white font-display font-bold text-[16px] mb-5 shadow-md`}>
                  {step.n}
                </div>
                <h3 className="font-bold text-[18px] text-[#0D2137] mb-2">{step.title}</h3>
                <p className="text-[14px] text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRUST / SECURITY ── */}
      <section id="trust" className="py-28 bg-[#0D2137]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="text-[12px] uppercase tracking-widest text-[#F5A623] font-bold mb-3">Security first</div>
            <h2 className="font-display font-semibold text-[36px] md:text-[44px] text-white">
              Built to be trusted
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { Icon: Lock,        title: "Non-custodial",  desc: "We never hold your private keys. Your wallet, your funds.", accent: "text-[#2E86AB]", bg: "bg-[#2E86AB]/10"  },
              { Icon: Search,      title: "Transparent",    desc: "Every yield source is shown on-chain. No hidden fees.",     accent: "text-[#F5A623]", bg: "bg-[#F5A623]/10"  },
              { Icon: ShieldCheck, title: "Audited",        desc: "Smart contracts reviewed by independent security firms.",   accent: "text-[#00C896]", bg: "bg-[#00C896]/10"  },
            ].map(({ Icon, title, desc, accent, bg }, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-3xl p-8 text-center hover:bg-white/8 transition-colors">
                <div className={`w-14 h-14 ${bg} rounded-2xl flex items-center justify-center mx-auto mb-5`}>
                  <Icon size={28} className={accent} />
                </div>
                <h3 className="font-bold text-[18px] text-white mb-2">{title}</h3>
                <p className="text-[14px] text-white/50 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-28 bg-gradient-to-br from-[#1A3C6E] to-[#0D2137] relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djZoNnYtNmgtNnptNiA2djZoNnYtNmgtNnptLTEyIDBoNnY2aC02di02eiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="relative z-10 max-w-2xl mx-auto px-6 text-center">
          <h2 className="font-display font-bold text-[40px] md:text-[52px] text-white leading-[1.1] mb-5">
            Ready to make your money work?
          </h2>
          <p className="text-[17px] text-white/60 mb-10">
            Join thousands of Africans using Blin Finance to save, swap, and invest — without the traditional banking friction.
          </p>
          <HeroCTA />
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[#060F1A] py-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-baseline gap-1">
            <span className="font-display font-bold text-[20px] text-white">Blin</span>
            <span className="font-body text-[20px] text-[#2E86AB]">Finance</span>
          </div>
          <div className="flex gap-6 text-[13px] text-white/50">
            {["Whitepaper", "Docs", "Twitter", "GitHub"].map((l) => (
              <a key={l} href="#" className="hover:text-white transition-colors">{l}</a>
            ))}
          </div>
          <div className="text-[12px] text-white/30 text-center">
            © 2026 Blin Finance · Not financial advice · DeFi involves risk
          </div>
        </div>
      </footer>
    </div>
  );
}
