import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Copy, ArrowUpRight, ArrowDownLeft, Repeat, PiggyBank, TrendingUp, Banknote, ChevronRight } from 'lucide-react';
import { UserAvatar } from '../components/auth/UserAvatar';
import { BlinCard } from '../components/ui/BlinCard';
import { BlinBadge } from '../components/ui/BlinBadge';
import { TokenIcon } from '../components/ui/TokenIcon';
import { AmountDisplay } from '../components/ui/AmountDisplay';
import { ProgressBar } from '../components/ui/ProgressBar';
import { TransactionRow } from '../components/ui/TransactionRow';
import { useNotifications } from '../components/NotificationContext';
import { mockUser, mockBalances, mockVault, mockLocks, mockTransactions, mockStocks } from '../lib/mockData';

export default function Dashboard() {
  const navigate = useNavigate();
  const { addNotification } = useNotifications();

  useEffect(() => {
    // Simulate a market alert after some time
    const timer = setTimeout(() => {
      addNotification({
        title: 'Market Alert: Apple (AAPL)',
        message: 'AAPL is up 2.4% in pre-market trading following strong analyst reports.',
        type: 'alert'
      });
    }, 5000);

    return () => clearTimeout(timer);
  }, [addNotification]);

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      {/* Header */}
      <header className="flex items-center justify-between sticky top-0 bg-surface-bg/90 backdrop-blur-md z-20 py-4 -mx-4 px-4 md:mx-0 md:px-0">
        <div>
          <h1 className="font-body font-semibold text-[16px] text-text-primary">
            Good afternoon, {mockUser.firstName}
          </h1>
          <p className="text-[12px] text-text-muted">Monday, March 16</p>
        </div>
        <div className="flex items-center gap-4 md:hidden">
          <UserAvatar size="md" className="cursor-pointer" onClick={() => navigate('/profile')} />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        {/* Left Column */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Wallet Balance Card */}
          <BlinCard variant="dark" className="bg-gradient-to-br from-[#0D2137] via-[#1A3C6E] to-[#2E86AB] p-6 md:p-8">
            <div className="absolute top-[-50px] right-[-50px] w-[300px] h-[300px] rounded-full bg-white/5 blur-[40px]" />
            <div className="absolute bottom-[-50px] left-[-50px] w-[200px] h-[200px] rounded-full bg-white/5 blur-[30px]" />
            
            <div className="relative z-10">
              <div className="text-[12px] text-white/60 uppercase tracking-wider font-semibold mb-2">Total Balance</div>
              <div className="flex flex-col gap-1 mb-4">
                <div className="flex items-baseline gap-2">
                  <AmountDisplay amount={mockBalances.totalUsd} currency="USD" className="text-[40px] md:text-[44px] text-white leading-none font-bold" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white/50 text-[14px]">≈</span>
                  <AmountDisplay amount={mockBalances.totalNgn} currency="NGN" className="text-[18px] md:text-[20px] text-white/80 leading-none" />
                </div>
              </div>
              <div className="inline-flex items-center px-2 py-1 bg-[#00C896]/15 rounded-full text-brand-green text-[12px] font-semibold mb-6">
                +₦{(mockBalances.dayChangeUsd * 1580).toLocaleString()} ({mockBalances.dayChangePct}%) today
              </div>

              <div className="flex items-center gap-2 mb-8">
                <span className="font-mono text-[13px] text-white/70">{mockUser.walletAddress.substring(0,6)}...{mockUser.walletAddress.substring(38)}</span>
                <button className="text-white/50 hover:text-white"><Copy size={14} /></button>
                <div className="w-1 h-1 bg-white/30 rounded-full mx-1" />
                <span className="w-4 h-4 rounded-full bg-[#627EEA] flex items-center justify-center text-[8px] font-bold">E</span>
                <span className="w-4 h-4 rounded-full bg-[#F3BA2F] flex items-center justify-center text-[8px] font-bold text-black">B</span>
              </div>

              <div className="flex gap-3">
                <button onClick={() => navigate('/fiat')} className="flex-1 flex items-center justify-center gap-2 h-11 bg-white/15 hover:bg-white/25 text-white rounded-full text-[14px] font-semibold transition-colors backdrop-blur-sm">
                  <ArrowDownLeft size={18} /> Add Funds
                </button>
                <button onClick={() => navigate('/fiat')} className="flex-1 flex items-center justify-center gap-2 h-11 bg-white/15 hover:bg-white/25 text-white rounded-full text-[14px] font-semibold transition-colors backdrop-blur-sm">
                  <ArrowUpRight size={18} /> Withdraw
                </button>
              </div>
            </div>
          </BlinCard>

          {/* Quick Actions */}
          <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2 -mx-4 px-4 md:mx-0 md:px-0">
            {[
              { icon: Repeat, label: "Swap", path: "/swap", color: "text-brand-blue" },
              { icon: PiggyBank, label: "Save", path: "/vault", color: "text-brand-gold" },
              { icon: TrendingUp, label: "Buy Stock", path: "/stocks", color: "text-[#7C3AED]" },
              { icon: Banknote, label: "Add NGN", path: "/fiat", color: "text-brand-green" },
              { icon: ArrowUpRight, label: "Send", path: "/swap", color: "text-text-primary" },
            ].map((action, i) => (
              <motion.button
                key={i}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(action.path)}
                className="flex items-center gap-2 h-11 px-5 bg-white rounded-full shadow-sm border border-border-light shrink-0 hover:bg-surface-raised transition-colors"
              >
                <action.icon size={16} className={action.color} />
                <span className="font-semibold text-[14px] text-text-primary">{action.label}</span>
              </motion.button>
            ))}
          </div>

          {/* AutoSave Snapshot */}
          {mockVault.enabled && (
            <BlinCard variant="gold" className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/vault')}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <PiggyBank size={20} className="text-white" />
                  </div>
                  <div>
                    <div className="text-[13px] text-white/80 uppercase font-semibold tracking-wider">AutoSave Vault</div>
                    <AmountDisplay amount={mockVault.balanceUsd} currency="USD" className="text-[24px] font-semibold" />
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="px-2 py-1 bg-white/20 rounded-full text-[12px] font-bold mb-1">{mockVault.apy}% APY</span>
                  <ChevronRight size={20} className="text-white/70" />
                </div>
              </div>
              <div className="text-[12px] text-white/80 mb-2">Unlocks in {mockVault.daysRemaining} days</div>
              <ProgressBar progress={60} variant="gold" className="opacity-80" />
            </BlinCard>
          )}

          {/* Token Balances */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-[16px] text-text-primary">Your Assets</h2>
              <button className="text-[13px] font-semibold text-brand-accent hover:underline">Manage &rarr;</button>
            </div>
            <div className="bg-white rounded-[16px] border border-border-light overflow-hidden">
              {mockBalances.tokens.map((token, i) => (
                <div key={i} className="flex items-center justify-between p-4 border-b border-border-light last:border-0 hover:bg-surface-raised transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <TokenIcon symbol={token.symbol} size={36} />
                    <div>
                      <div className="font-bold text-[15px] text-text-primary">{token.name}</div>
                      <div className="text-[13px] text-text-muted">{token.symbol}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-[15px] text-text-primary">
                      {token.balance.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                    </div>
                    <AmountDisplay amount={token.usdValue} currency="USD" className="text-[13px] text-text-muted" />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Stocks Mini Portfolio */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-[16px] text-text-primary">Stocks Portfolio</h2>
              <button onClick={() => navigate('/stocks')} className="text-[13px] font-semibold text-brand-accent hover:underline">View Portfolio &rarr;</button>
            </div>
            <BlinCard className="p-0">
              <div className="p-5 border-b border-border-light">
                <div className="text-[13px] text-text-secondary mb-1">Total Value</div>
                <div className="flex items-baseline gap-2">
                  <AmountDisplay amount={mockStocks.totalUsd} currency="USD" className="text-[24px] font-bold" />
                  <BlinBadge variant={mockStocks.dayChangePct >= 0 ? 'success' : 'error'}>
                    {mockStocks.dayChangePct >= 0 ? '+' : ''}{mockStocks.dayChangePct}%
                  </BlinBadge>
                </div>
              </div>
              <div className="p-2">
                {mockStocks.holdings.slice(0, 3).map((stock, i) => (
                  <div key={i} className="flex items-center justify-between p-3 hover:bg-surface-raised rounded-lg cursor-pointer">
                    <div className="flex items-center gap-3">
                      <TokenIcon symbol={stock.symbol} size={36} />
                      <div>
                        <div className="font-bold text-[14px]">{stock.symbol}</div>
                        <div className="text-[12px] text-text-muted">{stock.shares} shares</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-[14px]">${stock.price.toFixed(2)}</div>
                      <div className={`text-[12px] font-medium ${stock.changePct >= 0 ? 'text-brand-green' : 'text-brand-red'}`}>
                        {stock.changePct >= 0 ? '+' : ''}{stock.changePct}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </BlinCard>
          </div>

          {/* Recent Activity */}
          <div>
            <h2 className="font-bold text-[16px] text-text-primary mb-4">Recent Activity</h2>
            <div className="bg-white rounded-[16px] border border-border-light overflow-hidden">
              {mockTransactions.slice(0, 5).map((tx) => (
                <TransactionRow
                  key={tx.id}
                  type={tx.type}
                  title={tx.title}
                  date={tx.date}
                  amount={tx.amount}
                  usdValue={tx.usdValue}
                  isPositive={tx.isPositive}
                  className="border-b border-border-light last:border-0 rounded-none"
                />
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
