import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PiggyBank, ChevronRight, Lock, Plus, CheckCircle2, Settings } from 'lucide-react';
import { BlinButton } from '../components/ui/BlinButton';
import { BlinCard } from '../components/ui/BlinCard';
import { BlinBadge } from '../components/ui/BlinBadge';
import { TokenIcon } from '../components/ui/TokenIcon';
import { AmountDisplay } from '../components/ui/AmountDisplay';
import { ProgressBar } from '../components/ui/ProgressBar';
import { BottomSheet } from '../components/ui/BottomSheet';
import { useNotifications } from '../components/NotificationContext';
import { mockVault, mockLocks } from '../lib/mockData';

export default function Vault() {
  const { addNotification } = useNotifications();
  const [isCreateLockOpen, setIsCreateLockOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isBreakOpen, setIsBreakOpen] = useState(false);
  const [selectedLock, setSelectedLock] = useState(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [editName, setEditName] = useState('');
  const [createStep, setCreateStep] = useState(0);

  const handleCreateLock = () => {
    setIsCreateLockOpen(false);
    setCreateStep(0);
    
    addNotification({
      title: 'New Lock Created!',
      message: 'Your "School Fees" lock of $500.00 is now active. Earn yield until Sept 15, 2026.',
      type: 'success'
    });
  };

  const handleWithdrawClick = (lock) => {
    setSelectedLock(lock);
    setIsWithdrawOpen(true);
  };

  const handleTopUpClick = (lock) => {
    setSelectedLock(lock);
    setTopUpAmount('');
    setIsTopUpOpen(true);
  };

  const handleEditClick = (lock) => {
    setSelectedLock(lock);
    setEditName(lock.name);
    setIsEditOpen(true);
  };

  const handleBreakClick = (lock) => {
    setSelectedLock(lock);
    setIsBreakOpen(true);
  };

  const handleConfirmWithdraw = () => {
    setIsWithdrawing(true);
    // Simulate transaction delay
    setTimeout(() => {
      setIsWithdrawing(false);
      setIsWithdrawOpen(false);
      addNotification({
        title: 'Withdrawal Successful!',
        message: `Successfully withdrawn ${selectedLock.amount} ${selectedLock.token} to your main wallet.`,
        type: 'success'
      });
      setSelectedLock(null);
    }, 2000);
  };

  const handleConfirmTopUp = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsTopUpOpen(false);
      addNotification({
        title: 'Top Up Successful!',
        message: `Added ${topUpAmount} ${selectedLock.token} to "${selectedLock.name}".`,
        type: 'success'
      });
    }, 1500);
  };

  const handleConfirmEdit = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsEditOpen(false);
      addNotification({
        title: 'Settings Updated',
        message: `Changed lock name to "${editName}".`,
        type: 'success'
      });
    }, 1000);
  };

  const handleConfirmBreak = () => {
    setIsProcessing(true);
    const penalty = selectedLock.amount * 0.15;
    const received = selectedLock.amount - penalty;
    setTimeout(() => {
      setIsProcessing(false);
      setIsBreakOpen(false);
      addNotification({
        title: 'Lock Broken',
        message: `Withdrawn ${received.toFixed(2)} ${selectedLock.token} after 15% penalty (${penalty.toFixed(2)} ${selectedLock.token}).`,
        type: 'warning'
      });
      setSelectedLock(null);
    }, 2500);
  };

  return (
    <div className="flex flex-col gap-8 pb-10">
      <h1 className="font-display font-semibold text-[20px] text-text-primary">Vault & Saves</h1>

      {/* AutoSave Section */}
      <section>
        {mockVault.enabled ? (
          <BlinCard variant="gold" className="relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
              <BlinBadge variant="neutral" className="bg-white/20 text-white border-0 shadow-sm backdrop-blur-sm">
                {mockVault.apy}% APY
              </BlinBadge>
            </div>
            
            <div className="flex items-center gap-2 mb-2">
              <PiggyBank size={16} className="text-white/80" />
              <span className="text-[13px] text-white/80 uppercase tracking-wider font-semibold">AutoSave Vault</span>
            </div>
            
            <AmountDisplay amount={mockVault.balanceUsd} currency="USD" className="text-[40px] font-bold text-white leading-none mb-1" />
            <div className="text-[13px] text-white/80 mb-6">
              +${mockVault.yieldEarnedUsd} yield earned
            </div>

            <div className="bg-white/10 rounded-xl p-4 mb-6 backdrop-blur-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[12px] text-white/80">Unlocks Apr 15, 2026</span>
                <span className="text-[12px] text-white font-semibold">{mockVault.daysRemaining} days remaining</span>
              </div>
              <ProgressBar progress={60} variant="gold" className="opacity-80" />
            </div>

            <div className="flex gap-3">
              <button className="flex-1 h-11 bg-white/15 hover:bg-white/25 rounded-full text-[14px] font-semibold transition-colors">
                Edit Settings
              </button>
              <button className="flex-1 h-11 bg-white/30 text-white/50 cursor-not-allowed rounded-full text-[14px] font-semibold">
                Withdraw
              </button>
            </div>
          </BlinCard>
        ) : (
          <BlinCard variant="dark" className="bg-gradient-to-br from-[#1A3C6E] to-[#2E86AB] text-center p-8">
            <PiggyBank size={64} className="text-brand-gold mx-auto mb-4" />
            <h2 className="font-display font-semibold text-[22px] text-white mb-2">Start AutoSaving</h2>
            <p className="text-[14px] text-white/70 mb-6">Save a % of every swap automatically and earn yield while it's locked.</p>
            <BlinButton variant="gold" className="w-full">Set Up AutoSave</BlinButton>
          </BlinCard>
        )}
      </section>

      {/* Custom Locks Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-[18px] text-text-primary">My Locks</h2>
            <BlinBadge variant="neutral">{mockLocks.length} active</BlinBadge>
          </div>
          <BlinButton variant="gold" size="sm" className="h-9 px-4" onClick={() => setIsCreateLockOpen(true)}>
            <Plus size={16} className="mr-1" /> New Lock
          </BlinButton>
        </div>

        <div className="flex flex-col gap-4">
          {mockLocks.map((lock, i) => (
            <motion.div
              key={lock.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.3, ease: "easeOut" }}
            >
              <BlinCard accentLeft accentColor="var(--brand-gold)" className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <span className="font-bold text-[15px] text-text-primary">{lock.name}</span>
                  <BlinBadge variant={lock.status === 'Locked' ? 'locked' : 'success'} showDot>
                    {lock.status}
                  </BlinBadge>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <TokenIcon symbol={lock.token} size={28} />
                    <div>
                      <div className="font-display font-semibold text-[22px] leading-none mb-1">
                        {lock.amount} <span className="text-[14px] text-text-muted">{lock.token}</span>
                      </div>
                      <div className="inline-flex items-center px-2 py-0.5 bg-brand-green/10 text-brand-green text-[11px] font-bold rounded-full">
                        +${lock.yieldEarned.toFixed(2)} yield
                      </div>
                    </div>
                  </div>
                  {lock.target && (
                    <div className="relative w-10 h-10">
                      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                        <path className="text-border-light" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path className="text-brand-gold" strokeDasharray={`${(lock.amount/lock.target)*100}, 100`} strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">
                        {Math.round((lock.amount/lock.target)*100)}%
                      </div>
                    </div>
                  )}
                </div>

                {lock.target && (
                  <div className="mb-4">
                    <ProgressBar progress={(lock.amount/lock.target)*100} variant="gold" className="mb-1" />
                    <div className="text-[12px] text-text-muted">{Math.round((lock.amount/lock.target)*100)}% of ${lock.target} goal</div>
                  </div>
                )}

                <div className="flex justify-between items-center text-[12px] text-text-muted mb-4 bg-surface-raised p-2 rounded-lg">
                  <div className="flex items-center gap-1">
                    {lock.status === 'Locked' ? <Lock size={14} /> : <CheckCircle2 size={14} className="text-brand-green" />}
                    <span className={lock.status === 'Ready' ? 'text-brand-green font-semibold' : ''}>
                      {lock.status === 'Locked' ? `${lock.daysRemaining} days remaining` : 'Ready to withdraw'}
                    </span>
                  </div>
                  <span>Unlocks {new Date(Date.now() + lock.daysRemaining * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleTopUpClick(lock)}
                      className="px-3 py-1.5 rounded-full border border-border-medium text-[12px] font-semibold hover:bg-surface-raised transition-colors"
                    >
                      Top Up
                    </button>
                    <button 
                      onClick={() => handleEditClick(lock)}
                      className="px-3 py-1.5 rounded-full border border-border-medium text-[12px] font-semibold hover:bg-surface-raised transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                  {lock.status === 'Ready' ? (
                    <BlinButton 
                      size="sm" 
                      className="h-8 px-4 text-[12px]"
                      onClick={() => handleWithdrawClick(lock)}
                    >
                      Withdraw
                    </BlinButton>
                  ) : (
                    <button 
                      onClick={() => handleBreakClick(lock)}
                      className="text-[12px] font-semibold text-brand-red hover:underline"
                    >
                      Break Lock
                    </button>
                  )}
                </div>
              </BlinCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Create Lock FAB (Mobile) */}
      <div className="fixed bottom-[80px] left-4 right-4 md:hidden z-20">
        <BlinButton variant="gold" className="w-full shadow-lg" onClick={() => setIsCreateLockOpen(true)}>
          <Lock size={18} className="mr-2" /> Create a New Lock
        </BlinButton>
      </div>

      {/* Withdrawal Bottom Sheet */}
      <BottomSheet 
        isOpen={isWithdrawOpen} 
        onClose={() => { if (!isWithdrawing) setIsWithdrawOpen(false); }}
        className="h-auto pb-8"
      >
        <div className="flex flex-col">
          <div className="w-16 h-16 rounded-full bg-brand-green/10 flex items-center justify-center text-brand-green mx-auto mb-6">
            <CheckCircle2 size={32} />
          </div>
          
          <h2 className="font-display font-semibold text-[24px] text-center mb-2">Ready to withdraw!</h2>
          <p className="text-text-secondary text-center mb-8 px-4">
            Your lock "<span className="font-bold text-text-primary">{selectedLock?.name}</span>" has matured. 
            Withdraw your funds plus earned yield.
          </p>

          <div className="bg-surface-raised rounded-2xl p-6 mb-8 border border-border-light">
            <div className="flex flex-col items-center gap-1 mb-6">
              <div className="text-[12px] text-text-secondary uppercase font-bold tracking-widest">Total to receive</div>
              <div className="flex items-baseline gap-2">
                <span className="font-display font-bold text-[36px] text-text-primary">
                  {(selectedLock?.amount + (selectedLock?.yieldEarned || 0)).toFixed(2)}
                </span>
                <span className="text-[16px] font-bold text-text-muted">{selectedLock?.token}</span>
              </div>
            </div>
            
            <div className="space-y-3 pt-4 border-t border-border-medium">
              <div className="flex justify-between text-[14px]">
                <span className="text-text-secondary">Principal</span>
                <span className="font-semibold">{selectedLock?.amount} {selectedLock?.token}</span>
              </div>
              <div className="flex justify-between text-[14px]">
                <span className="text-text-secondary">Yield Earned</span>
                <span className="font-semibold text-brand-green">+{selectedLock?.yieldEarned.toFixed(2)} {selectedLock?.token}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <BlinButton 
              variant="gold" 
              className="w-full h-14 rounded-2xl text-[16px] font-bold" 
              onClick={handleConfirmWithdraw}
              isLoading={isWithdrawing}
            >
              Withdraw to Main Wallet
            </BlinButton>
            <button 
              disabled={isWithdrawing}
              onClick={() => setIsWithdrawOpen(false)}
              className="w-full h-10 text-[14px] font-semibold text-text-muted hover:text-text-primary disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Top Up Bottom Sheet */}
      <BottomSheet 
        isOpen={isTopUpOpen} 
        onClose={() => setIsTopUpOpen(false)}
        className="h-auto pb-8"
      >
        <div className="flex flex-col">
          <div className="w-16 h-16 rounded-full bg-brand-blue/10 flex items-center justify-center text-brand-blue mx-auto mb-6">
            <Plus size={32} />
          </div>
          <h2 className="font-display font-semibold text-[24px] text-center mb-2">Top Up Lock</h2>
          <p className="text-text-secondary text-center mb-8 px-4">
            Add more funds to "<span className="font-bold text-text-primary">{selectedLock?.name}</span>" to earn more yield.
          </p>

          <div className="bg-surface-raised rounded-2xl p-6 mb-8 border border-border-light">
            <div className="text-center">
              <input 
                type="text" 
                placeholder="0.00" 
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
                className="w-full text-center font-display font-semibold text-[48px] outline-none bg-transparent text-text-primary placeholder:text-text-muted" 
              />
              <div className="text-[14px] text-text-muted font-bold">{selectedLock?.token}</div>
            </div>
          </div>

          <BlinButton 
            variant="gold" 
            className="w-full h-14 rounded-2xl text-[16px] font-bold" 
            onClick={handleConfirmTopUp}
            isLoading={isProcessing}
            disabled={!topUpAmount || parseFloat(topUpAmount) <= 0}
          >
            Confirm Top Up
          </BlinButton>
        </div>
      </BottomSheet>

      {/* Edit Lock Bottom Sheet */}
      <BottomSheet 
        isOpen={isEditOpen} 
        onClose={() => setIsEditOpen(false)}
        className="h-auto pb-8"
      >
        <div className="flex flex-col">
          <div className="w-16 h-16 rounded-full bg-brand-gold/10 flex items-center justify-center text-brand-gold mx-auto mb-6">
            <Settings size={32} />
          </div>
          <h2 className="font-display font-semibold text-[24px] text-center mb-8">Edit Lock</h2>

          <div className="space-y-6 mb-8">
            <div className="flex flex-col gap-2">
              <label className="text-[12px] font-bold text-text-secondary uppercase tracking-wider ml-1">Lock Name</label>
              <input 
                type="text" 
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full h-14 bg-surface-raised rounded-xl px-4 font-semibold text-[16px] outline-none border border-border-light focus:border-brand-accent transition-colors"
                placeholder="e.g. School Fees"
              />
            </div>
          </div>

          <BlinButton 
            variant="gold" 
            className="w-full h-14 rounded-2xl text-[16px] font-bold" 
            onClick={handleConfirmEdit}
            isLoading={isProcessing}
            disabled={!editName}
          >
            Save Changes
          </BlinButton>
        </div>
      </BottomSheet>

      {/* Break Lock Bottom Sheet */}
      <BottomSheet 
        isOpen={isBreakOpen} 
        onClose={() => setIsBreakOpen(false)}
        className="h-auto pb-8"
      >
        <div className="flex flex-col">
          <div className="w-16 h-16 rounded-full bg-brand-red/10 flex items-center justify-center text-brand-red mx-auto mb-6">
            <Lock size={32} />
          </div>
          <h2 className="font-display font-semibold text-[24px] text-center mb-2 text-brand-red">Break Lock Early?</h2>
          <p className="text-text-secondary text-center mb-8 px-4">
            Breaking a lock early incurs a <span className="font-black text-brand-red">15% penalty fee</span> on your principal.
          </p>

          <div className="bg-brand-red/[0.03] rounded-2xl p-6 mb-8 border border-brand-red/10">
            <div className="space-y-4">
              <div className="flex justify-between text-[14px]">
                <span className="text-text-secondary">Principal</span>
                <span className="font-semibold">{selectedLock?.amount} {selectedLock?.token}</span>
              </div>
              <div className="flex justify-between text-[14px]">
                <span className="text-text-secondary">Penalty (15%)</span>
                <span className="font-bold text-brand-red">-{selectedLock ? (selectedLock.amount * 0.15).toFixed(2) : 0} {selectedLock?.token}</span>
              </div>
              <div className="border-t border-brand-red/10 pt-4 flex justify-between items-center">
                <span className="font-bold text-text-primary text-[15px]">You receive</span>
                <span className="font-black text-[20px] text-brand-blue">
                  {selectedLock ? (selectedLock.amount * 0.85).toFixed(2) : 0} {selectedLock?.token}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <BlinButton 
              className="w-full h-14 rounded-2xl text-[16px] font-bold bg-brand-red hover:bg-red-600 border-none" 
              onClick={handleConfirmBreak}
              isLoading={isProcessing}
            >
              Break Lock & Pay Penalty
            </BlinButton>
            <button 
              onClick={() => setIsBreakOpen(false)}
              className="w-full h-10 text-[14px] font-semibold text-text-muted hover:text-text-primary"
            >
              Keep Lock & Earn Yield
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Create Lock Bottom Sheet */}
      <BottomSheet 
        isOpen={isCreateLockOpen} 
        onClose={() => { setIsCreateLockOpen(false); setCreateStep(0); }}
        steps={3}
        currentStep={createStep}
        className="h-[85vh]"
      >
        <AnimatePresence mode="wait">
          {createStep === 0 && (
            <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col h-full">
              <h2 className="font-display font-semibold text-[24px] mb-6">What are you saving for?</h2>
              
              <div className="mb-6">
                <input type="text" placeholder="e.g. School Fees, Holiday" className="w-full h-14 bg-surface-raised rounded-xl px-4 font-semibold text-[16px] outline-none border border-border-light focus:border-brand-accent transition-colors" />
                <div className="text-right text-[12px] text-text-muted mt-1">0/64</div>
              </div>

              <div className="mb-6">
                <div className="flex gap-2 mb-4">
                  <button className="flex-1 py-2 rounded-full border-2 border-brand-blue bg-brand-blue/5 text-brand-blue font-semibold text-[14px]">USDT</button>
                  <button className="flex-1 py-2 rounded-full border-2 border-transparent bg-surface-raised text-text-secondary font-semibold text-[14px]">USDC</button>
                </div>
                <div className="text-center">
                  <input type="text" placeholder="0.00" className="w-full text-center font-display font-semibold text-[48px] outline-none text-text-primary placeholder:text-text-muted" />
                  <div className="text-[14px] text-text-muted">≈ $0.00</div>
                </div>
              </div>

              <div className="mt-auto">
                <BlinButton variant="gold" className="w-full" onClick={() => setCreateStep(1)}>Next &rarr;</BlinButton>
              </div>
            </motion.div>
          )}

          {createStep === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col h-full">
              <h2 className="font-display font-semibold text-[24px] mb-6">Choose your lock duration</h2>
              
              <div className="grid grid-cols-2 gap-3 mb-8">
                {['1 Month', '3 Months', '6 Months', '1 Year', '2 Years', 'Custom ⚙'].map((d, i) => (
                  <button key={i} className={`py-4 rounded-xl border-2 font-semibold text-[15px] transition-all ${i === 2 ? 'border-brand-gold bg-brand-gold/10 text-brand-gold-dark' : 'border-border-light bg-white text-text-secondary hover:border-brand-gold/50'}`}>
                    {d}
                  </button>
                ))}
              </div>

              <div className="text-center mb-8">
                <div className="text-[14px] text-text-muted mb-1">Unlocks on</div>
                <div className="font-display font-semibold text-[28px] text-brand-blue">Sept 15, 2026</div>
              </div>

              <div className="mt-auto flex gap-3">
                <BlinButton variant="ghost" className="flex-1" onClick={() => setCreateStep(0)}>&larr; Back</BlinButton>
                <BlinButton variant="gold" className="flex-[2]" onClick={() => setCreateStep(2)}>Review &rarr;</BlinButton>
              </div>
            </motion.div>
          )}

          {createStep === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col h-full">
              <h2 className="font-display font-semibold text-[24px] mb-6">Review & Lock</h2>
              
              <div className="bg-surface-raised border border-border-light rounded-2xl p-5 mb-6 space-y-4">
                <div className="flex justify-between text-[14px]"><span className="text-text-secondary">Goal</span><span className="font-semibold">School Fees</span></div>
                <div className="flex justify-between text-[14px]"><span className="text-text-secondary">Token</span><span className="font-semibold flex items-center gap-1"><TokenIcon symbol="USDT" size={20} /> USDT</span></div>
                <div className="flex justify-between text-[14px]"><span className="text-text-secondary">Amount</span><span className="font-semibold">$500.00</span></div>
                <div className="flex justify-between text-[14px]"><span className="text-text-secondary">Lock Until</span><span className="font-semibold">Sept 15, 2026</span></div>
                <div className="flex justify-between text-[14px]"><span className="text-text-secondary">Duration</span><span className="font-semibold">6 months</span></div>
                <div className="flex justify-between text-[14px]"><span className="text-text-secondary">Est. Yield</span><span className="font-semibold text-brand-green">~$10.50 at 4.2% APY</span></div>
                
                <div className="border-t-2 border-dashed border-border-medium my-2" />
                
                <div className="flex justify-between text-[16px]"><span className="font-bold">You receive</span><span className="font-bold text-brand-green">~$510.50 at unlock</span></div>
              </div>

              <label className="flex items-start gap-3 mb-8 cursor-pointer group">
                <div className="w-6 h-6 rounded border-2 border-border-medium group-hover:border-brand-gold flex items-center justify-center shrink-0 mt-0.5 transition-colors">
                  {/* Checkbox state would go here */}
                </div>
                <span className="text-[14px] text-text-secondary leading-snug">I understand my funds are locked until Sept 15, 2026 and cannot be withdrawn early without a penalty.</span>
              </label>

              <div className="mt-auto flex gap-3">
                <BlinButton variant="ghost" className="flex-1" onClick={() => setCreateStep(1)}>&larr; Back</BlinButton>
                <BlinButton variant="gold" className="flex-[2]" onClick={handleCreateLock}>
                  <Lock size={18} className="mr-2" /> Confirm & Lock
                </BlinButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </BottomSheet>

    </div>
  );
}
