import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDownUp, Settings, Info, ChevronDown, PiggyBank, CheckCircle2, Search } from 'lucide-react';
import { BlinButton } from '../components/ui/BlinButton';
import { BlinCard } from '../components/ui/BlinCard';
import { TokenIcon } from '../components/ui/TokenIcon';
import { BottomSheet } from '../components/ui/BottomSheet';
import { useNotifications } from '../components/NotificationContext';

export default function Swap() {
  const { addNotification } = useNotifications();
  const [chain, setChain] = useState('ETH');
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [autoSave, setAutoSave] = useState(false);
  const [savePercentage, setSavePercentage] = useState(10);
  const [swapState, setSwapState] = useState('idle'); // idle, loading, success
  const [isTokenSheetOpen, setIsTokenSheetOpen] = useState(false);
  const [slippage, setSlippage] = useState('0.5');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const MAX_BALANCE = 1.24;

  const handleMaxClick = () => {
    setFromAmount(MAX_BALANCE.toString());
    setToAmount((MAX_BALANCE * 2847).toFixed(2));
  };

  const handleSwap = () => {
    setSwapState('loading');
    setTimeout(() => {
      setSwapState('success');
      
      addNotification({
        title: 'Swap Successful!',
        message: `Successfully swapped ${fromAmount} ETH for ${toAmount} USDT.`,
        type: 'success'
      });

      if (autoSave) {
        addNotification({
          title: 'Yield Added!',
          message: `₦${(parseFloat(toAmount) * (savePercentage / 100) * 1580).toLocaleString()} has been added to your AutoSave Vault.`,
          type: 'success'
        });
      }

      setTimeout(() => {
        setSwapState('idle');
        setFromAmount('');
        setToAmount('');
      }, 3000);
    }, 2000);
  };

  const handleFromAmountChange = (e) => {
    const val = e.target.value;
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      setFromAmount(val);
      setToAmount(val ? (parseFloat(val) * 2847).toFixed(2) : '');
    }
  };

  const switchTokens = () => {
    // Visual switch only for prototype
    const temp = fromAmount;
    setFromAmount(toAmount);
    setToAmount(temp);
  };

  return (
    <div className="flex flex-col items-center max-w-[480px] mx-auto w-full pb-10">
      
      {/* Header */}
      <div className="w-full flex justify-between items-center mb-6 px-1">
        <h1 className="font-display font-semibold text-[24px] tracking-tight text-brand-navy">Swap</h1>
        <div className="relative">
          <button 
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`p-2.5 rounded-full transition-all ${isSettingsOpen ? 'bg-brand-blue text-white shadow-lg' : 'text-text-secondary hover:bg-surface-raised border border-transparent hover:border-border-light'}`}
          >
            <Settings size={20} />
          </button>
          
          <AnimatePresence>
            {isSettingsOpen && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="absolute right-0 mt-3 w-[240px] bg-white rounded-2xl shadow-2xl border border-border-light overflow-hidden z-[100]"
              >
                <div className="p-4 border-b border-border-light bg-surface-raised/50">
                  <h3 className="font-bold text-[14px]">Settings</h3>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-1.5 mb-3">
                    <span className="text-[12px] font-semibold text-text-secondary uppercase tracking-wider">Slippage Tolerance</span>
                    <Info size={12} className="text-text-muted" />
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 p-1 bg-surface-raised rounded-xl mb-4">
                    {['0.1', '0.5', '1.0'].map(val => (
                      <button 
                        key={val}
                        onClick={() => setSlippage(val)}
                        className={`py-1.5 rounded-lg text-[11px] font-bold transition-all ${slippage === val ? 'bg-white text-brand-blue shadow-sm' : 'text-text-muted hover:text-text-primary'}`}
                      >
                        {val}%
                      </button>
                    ))}
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="Custom" 
                        value={['0.1', '0.5', '1.0'].includes(slippage) ? '' : slippage}
                        onChange={(e) => setSlippage(e.target.value.replace('%', ''))}
                        className="w-full h-full bg-transparent text-center text-[11px] font-bold outline-none placeholder:text-text-muted"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 mb-4 border-t border-border-light">
                    <div className="flex items-center gap-2">
                       <PiggyBank size={14} className="text-brand-gold" />
                       <span className="text-[12px] font-bold">AutoSave Vault</span>
                    </div>
                    <button 
                      onClick={() => setAutoSave(!autoSave)}
                      className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-300 ease-in-out ${autoSave ? 'bg-brand-gold' : 'bg-border-medium'}`}
                    >
                      <motion.div animate={{ x: autoSave ? 20 : 0 }} className="w-4 h-4 bg-white rounded-full shadow-sm" />
                    </button>
                  </div>

                  <AnimatePresence>
                    {autoSave && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="flex flex-col gap-2 pb-2">
                          <div className="flex justify-between items-center text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                            <span>Save Amount</span>
                            <span className="text-brand-gold">{savePercentage}%</span>
                          </div>
                          <input 
                            type="range"
                            min="1"
                            max="50"
                            step="1"
                            value={savePercentage}
                            onChange={(e) => setSavePercentage(parseInt(e.target.value))}
                            className="w-full h-1.5 bg-surface-raised rounded-lg appearance-none cursor-pointer accent-brand-gold"
                          />
                          <div className="flex justify-between text-[10px] text-text-muted font-medium">
                            <span>1%</span>
                            <span>50%</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Chain Selector */}
      <div className="flex p-1.5 bg-white/80 backdrop-blur-sm rounded-2xl border border-border-light mb-8 shadow-sm">
        <button 
          onClick={() => setChain('ETH')}
          className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-bold transition-all ${chain === 'ETH' ? 'bg-brand-navy text-white shadow-md' : 'text-text-secondary hover:text-text-primary'}`}
        >
          <div className="w-5 h-5 rounded-full bg-[#627EEA] flex items-center justify-center">
            <span className="text-[10px] text-white font-black">E</span>
          </div>
          Ethereum
        </button>
        <button 
          onClick={() => setChain('BSC')}
          className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-bold transition-all ${chain === 'BSC' ? 'bg-brand-navy text-white shadow-md' : 'text-text-secondary hover:text-text-primary'}`}
        >
          <div className="w-5 h-5 rounded-full bg-[#F3BA2F] flex items-center justify-center">
            <span className="text-[10px] text-brand-navy font-black">B</span>
          </div>
          BSC
        </button>
      </div>

      {/* Main Swap Card */}
      <div className="w-full relative group">
        <div className="absolute -inset-1 bg-gradient-to-b from-brand-blue/5 to-transparent rounded-[32px] blur-xl opacity-50 group-hover:opacity-100 transition-opacity" />
        
        <BlinCard className="relative w-full p-2.5 rounded-[30px] border-none shadow-2xl bg-white/90 backdrop-blur-md overflow-visible">
          
          {/* FROM */}
          <div className="bg-surface-raised/80 rounded-[22px] p-5 mb-1.5 border border-transparent focus-within:border-brand-blue/20 transition-all hover:bg-surface-raised">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.1em]">Pay with</span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-text-muted">Balance: {MAX_BALANCE}</span>
                <button 
                  onClick={handleMaxClick}
                  className="px-2 py-0.5 bg-brand-blue/10 text-brand-blue text-[10px] font-bold rounded-lg hover:bg-brand-blue hover:text-white transition-all uppercase tracking-wider"
                >
                  Max
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <button 
                onClick={() => setIsTokenSheetOpen(true)} 
                className="flex items-center gap-2.5 bg-white hover:shadow-md border border-border-light rounded-2xl py-2 pl-2 pr-4 shadow-sm transition-all shrink-0 active:scale-95"
              >
                <TokenIcon symbol="ETH" size={32} />
                <span className="font-bold text-[18px] text-brand-navy tracking-tight">ETH</span>
                <ChevronDown size={18} className="text-text-muted" />
              </button>
              <input 
                type="text" 
                placeholder="0" 
                value={fromAmount}
                onChange={handleFromAmountChange}
                className="bg-transparent text-right font-display font-medium text-[42px] w-full outline-none text-brand-navy placeholder:text-border-medium tracking-tight"
              />
            </div>
            <div className="flex justify-end mt-2">
              <span className="text-[13px] text-text-muted font-medium font-mono">${fromAmount ? (parseFloat(fromAmount) * 3520).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}</span>
            </div>
          </div>

          {/* Swap Button Wrapper */}
          <div className="relative h-4 flex justify-center items-center z-20">
            <motion.button 
              whileHover={{ rotate: 180, scale: 1.1 }}
              whileTap={{ scale: 0.9, rotate: 360 }}
              onClick={switchTokens}
              className="w-11 h-11 bg-white border-[3px] border-surface-bg rounded-2xl flex items-center justify-center shadow-xl text-brand-blue hover:text-brand-accent transition-all ring-1 ring-border-light"
            >
              <ArrowDownUp size={20} strokeWidth={2.5} />
            </motion.button>
          </div>

          {/* TO */}
          <div className="bg-brand-green/[0.03] rounded-[22px] p-5 mt-1.5 border border-brand-green/10 transition-all">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.1em]">Receive</span>
              <span className="text-[11px] font-bold text-text-muted">Balance: 4,500.00</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <button 
                onClick={() => setIsTokenSheetOpen(true)} 
                className="flex items-center gap-2.5 bg-white hover:shadow-md border border-border-light rounded-2xl py-2 pl-2 pr-4 shadow-sm transition-all shrink-0 active:scale-95"
              >
                <TokenIcon symbol="USDT" size={32} />
                <span className="font-bold text-[18px] text-brand-navy tracking-tight">USDT</span>
                <ChevronDown size={18} className="text-text-muted" />
              </button>
              <input 
                type="text" 
                placeholder="0" 
                value={toAmount}
                readOnly
                className={`bg-transparent text-right font-display font-medium text-[42px] w-full outline-none tracking-tight ${toAmount ? 'text-brand-green' : 'text-border-medium'}`}
              />
            </div>
            <div className="flex justify-end mt-2">
              <span className="text-[13px] text-text-muted font-medium font-mono">${toAmount ? parseFloat(toAmount).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}</span>
            </div>
          </div>

          {/* Price & Slippage Info (Embedded for clean look) */}
          <div className="px-5 py-4 flex flex-col gap-2.5">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5 group cursor-help">
                <span className="text-[12px] text-text-muted font-medium">1 ETH ≈ 2,847 USDT</span>
                <Info size={14} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div 
                className="flex items-center gap-1 cursor-pointer"
                onClick={() => setIsSettingsOpen(true)}
              >
                <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Slippage</span>
                <span className="text-[12px] font-bold text-brand-blue">{slippage}%</span>
              </div>
            </div>
            
            {fromAmount && (
              <button 
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center justify-center gap-1.5 w-full py-1 text-[11px] font-bold text-brand-blue/60 hover:text-brand-blue transition-colors"
              >
                {showDetails ? 'Hide details' : 'Show swap details'}
                <motion.div animate={{ rotate: showDetails ? 180 : 0 }}><ChevronDown size={14} /></motion.div>
              </button>
            )}

            <AnimatePresence>
              {showDetails && fromAmount && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }} 
                  animate={{ height: 'auto', opacity: 1 }} 
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="py-2 space-y-2.5 text-[12px]">
                    <div className="flex justify-between"><span className="text-text-secondary">Minimum received</span><span className="font-bold">{(parseFloat(toAmount) * 0.99).toFixed(2)} USDT</span></div>
                    <div className="flex justify-between"><span className="text-text-secondary">Expected Price Impact</span><span className="text-brand-green font-bold">&lt; 0.01%</span></div>
                    <div className="flex justify-between"><span className="text-text-secondary">Protocol Fee</span><span className="font-bold underline decoration-dotted underline-offset-2">0.05%</span></div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </BlinCard>
      </div>

      {/* Spacing */}
      <div className="h-6" />

      {/* AutoSave Toggle Card */}
      <motion.div 
        layout
        className={`w-full p-5 rounded-[24px] border-2 transition-all duration-300 ${autoSave ? 'bg-brand-gold/[0.03] border-brand-gold/20 shadow-lg shadow-brand-gold/5' : 'bg-surface-raised/40 border-border-light shadow-sm'}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${autoSave ? 'bg-brand-gold text-white' : 'bg-white shadow-sm text-brand-gold'}`}>
              <PiggyBank size={24} strokeWidth={2.5} />
            </div>
            <div>
              <div className="font-bold text-[16px] text-brand-navy">AutoSave Vault</div>
              <div className="text-[12px] text-text-secondary font-medium italic">Save {savePercentage}% of every swap</div>
            </div>
          </div>
          <button 
            onClick={() => setAutoSave(!autoSave)}
            className={`w-14 h-7 rounded-full p-1 transition-all duration-500 ease-out ${autoSave ? 'bg-brand-gold ring-4 ring-brand-gold/10' : 'bg-border-medium'}`}
          >
            <motion.div animate={{ x: autoSave ? 28 : 0 }} className="w-5 h-5 bg-white rounded-full shadow-md" />
          </button>
        </div>

        <AnimatePresence>
          {autoSave && fromAmount && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }} 
              animate={{ height: 'auto', opacity: 1 }} 
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-5 pt-5 border-t border-brand-gold/10 space-y-2.5">
                <div className="flex justify-between items-center text-[13px]">
                  <span className="text-brand-navy/60 font-medium">To be saved ({savePercentage}%)</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-brand-gold font-black">{(parseFloat(toAmount) * (savePercentage / 100)).toFixed(2)}</span>
                    <span className="text-[10px] font-black text-brand-gold/50 opacity-100">USDT</span>
                  </div>
                </div>
                <div className="flex justify-between items-center text-[13px]">
                  <span className="text-brand-navy/60 font-medium">Final receive</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-brand-navy font-black">{(parseFloat(toAmount) * (1 - savePercentage / 100)).toFixed(2)}</span>
                    <span className="text-[10px] font-black text-brand-navy/40">USDT</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Spacing */}
      <div className="h-8" />

      {/* Action Button */}
      <div className="w-full">
        {!fromAmount ? (
          <BlinButton variant="secondary" className="w-full h-[64px] rounded-3xl opacity-40 grayscale cursor-not-allowed" disabled>Enter an amount</BlinButton>
        ) : swapState === 'loading' ? (
          <BlinButton variant="gold" className="w-full h-[64px] rounded-3xl" isLoading>Routing swap...</BlinButton>
        ) : swapState === 'success' ? (
          <BlinButton className="w-full h-[64px] rounded-3xl bg-brand-green shadow-xl shadow-brand-green/20 ring-4 ring-brand-green/10">
            <CheckCircle2 size={22} className="mr-2" strokeWidth={2.5} /> Transaction Confirmed
          </BlinButton>
        ) : (
          <BlinButton 
            className="w-full h-[64px] rounded-3xl shadow-xl shadow-brand-blue/20 text-[18px] font-black" 
            onClick={handleSwap}
          >
            Review Swap
          </BlinButton>
        )}
      </div>

      <p className="mt-6 text-[11px] text-text-muted text-center max-w-[280px] leading-relaxed">
        By swapping, you agree to our <span className="underline decoration-dotted">Terms of Service</span> and acknowledge network risks.
      </p>

      {/* Token Selector Sheet */}
      <BottomSheet isOpen={isTokenSheetOpen} onClose={() => setIsTokenSheetOpen(false)} className="h-[80vh]">
        <div className="flex flex-col h-full bg-white">
          <div className="w-12 h-1.5 bg-border-light rounded-full mx-auto mb-6" />
          <h2 className="font-display font-semibold text-[22px] mb-6 text-center text-brand-navy tracking-tight">Select a token</h2>
          
          <div className="relative mb-6">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
            <input 
              type="text" 
              placeholder="Search name or paste address" 
              className="w-full h-[52px] bg-surface-raised/50 rounded-2xl pl-11 pr-4 outline-none border border-border-light focus:border-brand-blue focus:bg-white transition-all shadow-sm" 
            />
          </div>

          <div className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.2em] mb-3 ml-1">Popular tokens</div>
          <div className="flex gap-2 mb-8 overflow-x-auto hide-scrollbar -mx-1 px-1">
            {['ETH', 'USDT', 'USDC', 'WBTC'].map(t => (
              <button key={t} className="flex items-center gap-2 px-4 py-2 bg-white border border-border-light rounded-xl shrink-0 hover:border-brand-blue hover:shadow-md transition-all active:scale-95">
                <TokenIcon symbol={t} size={24} /> <span className="text-[14px] font-bold text-brand-navy">{t}</span>
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto -mx-5 px-5 space-y-1">
            {[
              { s: 'ETH', n: 'Ethereum', b: '1.24', v: '$4,364.80' },
              { s: 'USDT', n: 'Tether USD', b: '4,500.00', v: '$4,500.00' },
              { s: 'USDC', n: 'USD Coin', b: '2,100.00', v: '$2,100.00' },
              { s: 'UNI', n: 'Uniswap', b: '0.00', v: '$0.00' },
              { s: 'LINK', n: 'Chainlink', b: '0.00', v: '$0.00' },
            ].map((t, i) => (
              <div 
                key={i} 
                onClick={() => setIsTokenSheetOpen(false)} 
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-raised rounded-2xl transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <TokenIcon symbol={t.s} size={42} />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full border border-border-light flex items-center justify-center">
                       <div className="w-2.5 h-2.5 rounded-full bg-brand-green" />
                    </div>
                  </div>
                  <div>
                    <div className="font-bold text-[16px] text-brand-navy group-hover:text-brand-blue transition-colors">{t.s}</div>
                    <div className="text-[13px] text-text-muted font-medium">{t.n}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[16px] font-bold text-brand-navy">{t.b}</div>
                  <div className="text-[12px] text-text-muted font-mono">{t.v}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </BottomSheet>

    </div>
  );
}
