"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import {
  Copy, ChevronRight, ShieldCheck, HelpCircle, LogOut, Settings,
  PiggyBank, Lock, Globe, FileText, Camera, User, Mail, CheckCircle2,
  Loader2,
} from "lucide-react";
import { useChainId, useSwitchChain } from "wagmi";
import { BlinCard } from "@/components/ui/BlinCard";
import { UserAvatar } from "@/components/auth/UserAvatar";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { BlinButton } from "@/components/ui/BlinButton";
import { useAuth } from "@/hooks/useAuth";
import { useUserStore } from "@/store/userStore";
import { useProfile } from "@/hooks/useProfile";

// ── Chain metadata ────────────────────────────────────────────────────────────
const CHAINS = [
  {
    id:      1,
    name:    "Ethereum",
    label:   "ETH Mainnet",
    color:   "#627EEA",
    bg:      "bg-[#627EEA]/10",
    testnet: false,
    symbol:  "ETH",
  },
  {
    id:      56,
    name:    "BNB Chain",
    label:   "BSC Mainnet",
    color:   "#F3BA2F",
    bg:      "bg-[#F3BA2F]/10",
    testnet: false,
    symbol:  "BNB",
  },
  {
    id:      42161,
    name:    "Arbitrum One",
    label:   "ARB Mainnet",
    color:   "#28A0F0",
    bg:      "bg-[#28A0F0]/10",
    testnet: false,
    symbol:  "ARB",
  },
  {
    id:      421614,
    name:    "Arbitrum Sepolia",
    label:   "Testnet",
    color:   "#28A0F0",
    bg:      "bg-[#28A0F0]/10",
    testnet: true,
    symbol:  "ARB",
  },
] as const;

function ChainLogo({ color, symbol }: { color: string; symbol: string }) {
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-[11px] text-white shrink-0"
      style={{ backgroundColor: color }}
    >
      {symbol}
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { address, shortAddress, disconnect } = useAuth();
  const { displayName, email, setProfile, reset: resetStore } = useUserStore();
  const { saveToDb } = useProfile();

  const [isSignOutOpen, setIsSignOutOpen]         = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    displayName: displayName,
    email:       email,
  });
  const [isSaving, setIsSaving] = useState(false);

  const [notifPreferences, setNotifPreferences] = useState({
    transactions: true,
    market:       false,
    yield:        true,
  });

  // ── Network switcher ────────────────────────────────────────────────────────
  const chainId                          = useChainId();
  const { switchChain, isPending: isSwitching, variables: switchVars } = useSwitchChain();
  const [isNetworkOpen, setIsNetworkOpen] = useState(false);
  const activeChain = CHAINS.find((c) => c.id === chainId) ?? CHAINS[0];

  const handleSignOut = () => {
    setIsSignOutOpen(false);
    disconnect();
    router.replace("/login");
  };

  const handleSaveProfile = async () => {
    if (!editFormData.displayName.trim()) return;
    setIsSaving(true);
    setProfile({ displayName: editFormData.displayName.trim(), email: editFormData.email.trim() });
    await saveToDb();
    setIsSaving(false);
    setIsEditProfileOpen(false);
  };

  const toggleNotif = (key: keyof typeof notifPreferences) => {
    setNotifPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const openEditSheet = () => {
    setEditFormData({ displayName, email });
    setIsEditProfileOpen(true);
  };

  return (
    <div className="flex flex-col gap-6 pb-10 max-w-[600px] mx-auto">
      <h1 className="font-display font-semibold text-[20px] text-text-primary">Profile</h1>

      {/* User Card */}
      <BlinCard variant="dark" className="bg-gradient-to-br from-[#0D2137] to-[#1A3C6E] p-6 relative overflow-hidden">
        <div className="absolute top-[-50px] right-[-50px] w-[200px] h-[200px] rounded-full bg-white/5 blur-[30px]" />

        <div className="relative z-10 flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="relative group cursor-pointer" onClick={() => openEditSheet()}>
              <div className="relative">
                <UserAvatar size="xl" />
                <div className="absolute inset-0 bg-black/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera size={24} className="text-white" />
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setIsEditProfileOpen(true); }}
                className="absolute bottom-0 right-0 w-8 h-8 bg-brand-gold rounded-full flex items-center justify-center text-brand-navy shadow-lg border-2 border-[#0D2137] transition-transform hover:scale-110 active:scale-95"
              >
                <Settings size={14} />
              </button>
            </div>
            <div>
              <h2 className="font-display font-semibold text-[22px] text-white leading-tight">
                {displayName || shortAddress || "Anonymous"}
              </h2>
              <p className="text-[13px] text-white/60 mb-2">{email || "No email set"}</p>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/20 rounded-full text-[11px] font-semibold text-white">
                Web3 Wallet
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between bg-white/10 rounded-xl p-3 backdrop-blur-sm mb-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[13px] text-white/80">
              {shortAddress ?? address ?? "Not connected"}
            </span>
            <button
              onClick={() => address && navigator.clipboard.writeText(address)}
              className="text-white/50 hover:text-white"
            >
              <Copy size={14} />
            </button>
          </div>
          <button
            onClick={() => setIsNetworkOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: activeChain.color }} />
            <span className="text-[11px] font-bold text-white">{activeChain.name}</span>
            <ChevronRight size={11} className="text-white/70" />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[12px] text-white/50">Recently joined</span>
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-brand-gold font-bold">FlowScore: 0</span>
            <div className="w-24 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-brand-gold rounded-full" style={{ width: "78%" }} />
            </div>
          </div>
        </div>
      </BlinCard>

      {/* Settings Groups */}
      <div className="space-y-6">

        {/* Savings */}
        <div>
          <h3 className="text-[13px] font-semibold text-text-secondary uppercase tracking-wider mb-2 px-2">Savings</h3>
          <div className="bg-white rounded-[16px] border border-border-light overflow-hidden">
            <button onClick={() => router.push("/vaults")} className="w-full flex items-center justify-between p-4 border-b border-border-light hover:bg-surface-raised transition-colors">
              <div className="flex items-center gap-3">
                <PiggyBank size={20} className="text-brand-gold" />
                <span className="font-semibold text-[15px]">AutoSave Settings</span>
              </div>
              <div className="flex items-center gap-2 text-text-muted">
                <span className="text-[13px]">10% · 3 months</span>
                <ChevronRight size={18} />
              </div>
            </button>
            <button onClick={() => router.push("/vaults")} className="w-full flex items-center justify-between p-4 hover:bg-surface-raised transition-colors">
              <div className="flex items-center gap-3">
                <Lock size={20} className="text-brand-blue" />
                <span className="font-semibold text-[15px]">My Locks</span>
              </div>
              <div className="flex items-center gap-2 text-text-muted">
                <span className="text-[13px] bg-surface-raised px-2 py-0.5 rounded-md text-text-primary font-semibold">3 active</span>
                <ChevronRight size={18} />
              </div>
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div>
          <h3 className="text-[13px] font-semibold text-text-secondary uppercase tracking-wider mb-2 px-2">Notifications</h3>
          <div className="bg-white rounded-[16px] border border-border-light overflow-hidden">
            {([
              { key: "transactions" as const, label: "Successful Transactions", desc: "Alert when money enters or leaves wallet" },
              { key: "market"       as const, label: "Market Alerts",           desc: "Price fluctuations and trending stocks"  },
              { key: "yield"        as const, label: "Vault & Yield",           desc: "Notifications on vault lock and weekly yield" },
            ]).map((item, i) => (
              <div key={i} className="flex items-center justify-between p-4 border-b border-border-light last:border-0">
                <div className="flex-1 pr-4">
                  <div className="font-semibold text-[15px]">{item.label}</div>
                  <div className="text-[12px] text-text-muted leading-tight">{item.desc}</div>
                </div>
                <button
                  onClick={() => toggleNotif(item.key)}
                  className={`w-11 h-6 rounded-full p-1 transition-colors duration-200 ${notifPreferences[item.key] ? "bg-brand-blue" : "bg-border-medium"}`}
                >
                  <motion.div
                    className="w-4 h-4 bg-white rounded-full shadow-sm"
                    animate={{ x: notifPreferences[item.key] ? 20 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Networks */}
        <div>
          <h3 className="text-[13px] font-semibold text-text-secondary uppercase tracking-wider mb-2 px-2">Networks</h3>
          <div className="bg-white rounded-[16px] border border-border-light overflow-hidden">
            <button
              onClick={() => setIsNetworkOpen(true)}
              className="w-full flex items-center justify-between p-4 border-b border-border-light hover:bg-surface-raised transition-colors"
            >
              <div className="flex items-center gap-3">
                <Globe size={20} className="text-text-secondary" />
                <span className="font-semibold text-[15px]">Current Network</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: activeChain.color }} />
                <span className="text-[13px] font-semibold">{activeChain.name}</span>
                {activeChain.testnet && (
                  <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-bold">TESTNET</span>
                )}
                <ChevronRight size={16} className="text-text-muted" />
              </div>
            </button>
            <button className="w-full flex items-center justify-between p-4 hover:bg-surface-raised transition-colors">
              <div className="flex items-center gap-3">
                <ShieldCheck size={20} className="text-text-secondary" />
                <span className="font-semibold text-[15px]">Connected Apps</span>
              </div>
              <ChevronRight size={18} className="text-text-muted" />
            </button>
          </div>
        </div>

        {/* About */}
        <div>
          <h3 className="text-[13px] font-semibold text-text-secondary uppercase tracking-wider mb-2 px-2">About</h3>
          <div className="bg-white rounded-[16px] border border-border-light overflow-hidden">
            {[
              { icon: HelpCircle, label: "How AutoSave Works" },
              { icon: HelpCircle, label: "FAQs"               },
              { icon: FileText,   label: "Whitepaper"          },
            ].map((item, i) => (
              <button key={i} className="w-full flex items-center justify-between p-4 border-b border-border-light last:border-0 hover:bg-surface-raised transition-colors">
                <div className="flex items-center gap-3">
                  <item.icon size={20} className="text-text-secondary" />
                  <span className="font-semibold text-[15px]">{item.label}</span>
                </div>
                <ChevronRight size={18} className="text-text-muted" />
              </button>
            ))}
          </div>
        </div>

        {/* Sign Out */}
        <div className="pt-4 pb-8">
          <button
            onClick={() => setIsSignOutOpen(true)}
            className="w-full flex items-center justify-center gap-2 p-4 text-brand-red font-semibold text-[15px] hover:bg-brand-red/5 rounded-xl transition-colors"
          >
            <LogOut size={18} /> Sign Out
          </button>
        </div>

      </div>

      {/* Network Switcher Sheet */}
      <BottomSheet isOpen={isNetworkOpen} onClose={() => setIsNetworkOpen(false)} className="h-auto pb-8">
        <div className="flex flex-col pt-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-display font-semibold text-[24px]">Switch Network</h2>
              <p className="text-[13px] text-text-secondary mt-0.5">Select the chain you want to use</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-brand-blue/10 flex items-center justify-center text-brand-blue">
              <Globe size={22} />
            </div>
          </div>

          <div className="space-y-2 mb-6">
            {CHAINS.map((chain) => {
              const isActive    = chain.id === chainId;
              const isSwitchingTo = isSwitching && switchVars?.chainId === chain.id;
              return (
                <button
                  key={chain.id}
                  onClick={() => {
                    if (!isActive) switchChain({ chainId: chain.id });
                    else setIsNetworkOpen(false);
                  }}
                  disabled={isSwitching}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                    isActive
                      ? "border-brand-blue bg-brand-blue/5"
                      : "border-border-light bg-white hover:bg-surface-raised hover:border-border-medium"
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  <ChainLogo color={chain.color} symbol={chain.symbol} />

                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[15px]">{chain.name}</span>
                      {chain.testnet && (
                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-bold">TESTNET</span>
                      )}
                    </div>
                    <span className="text-[12px] text-text-muted">{chain.label}</span>
                  </div>

                  <div className="shrink-0">
                    {isSwitchingTo ? (
                      <Loader2 size={18} className="animate-spin text-brand-blue" />
                    ) : isActive ? (
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
                        <span className="text-[12px] font-semibold text-brand-green">Connected</span>
                      </div>
                    ) : (
                      <ChevronRight size={18} className="text-text-muted" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <p className="text-center text-[12px] text-text-muted px-4">
            Switching networks may require a wallet confirmation from your Privy embedded wallet.
          </p>
        </div>
      </BottomSheet>

      {/* Edit Profile Sheet */}
      <BottomSheet isOpen={isEditProfileOpen} onClose={() => setIsEditProfileOpen(false)} className="h-auto pb-8">
        <div className="flex flex-col pt-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-display font-semibold text-[24px]">Edit Profile</h2>
            <div className="w-12 h-12 rounded-full bg-brand-gold/10 flex items-center justify-center text-brand-gold">
              <User size={24} />
            </div>
          </div>

          <div className="space-y-5 mb-10">
            <div className="flex flex-col gap-2">
              <label className="text-[12px] font-bold text-text-secondary uppercase tracking-wider ml-1">Display Name</label>
              <div className="relative">
                <User size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  value={editFormData.displayName}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, displayName: e.target.value }))}
                  className="w-full h-14 bg-surface-raised rounded-2xl pl-12 pr-5 font-semibold text-[16px] outline-none border-2 border-transparent focus:border-brand-blue transition-all"
                  placeholder="Your name"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[12px] font-bold text-text-secondary uppercase tracking-wider ml-1">Email Address</label>
              <div className="relative">
                <Mail size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full h-14 bg-surface-raised rounded-2xl pl-12 pr-5 font-semibold text-[16px] outline-none border-2 border-transparent focus:border-brand-blue transition-all"
                  placeholder="name@example.com"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <BlinButton className="w-full h-14 rounded-2xl font-bold text-[16px]" onClick={handleSaveProfile} isLoading={isSaving}>
              Save Changes
            </BlinButton>
            <BlinButton variant="ghost" className="w-full h-14 rounded-2xl font-bold text-[16px]" onClick={() => setIsEditProfileOpen(false)}>
              Discard Changes
            </BlinButton>
          </div>
        </div>
      </BottomSheet>

      {/* Sign Out Sheet */}
      <BottomSheet isOpen={isSignOutOpen} onClose={() => setIsSignOutOpen(false)} className="h-auto pb-8">
        <div className="flex flex-col items-center text-center pt-4">
          <div className="w-16 h-16 rounded-full bg-brand-red/10 flex items-center justify-center text-brand-red mb-4">
            <LogOut size={32} />
          </div>
          <h2 className="font-display font-semibold text-[24px] mb-2">Sign Out?</h2>
          <p className="text-[15px] text-text-secondary mb-8">You will need to sign in with Google again to access your wallet.</p>
          <div className="flex flex-col gap-3 w-full">
            <BlinButton variant="danger" className="w-full" onClick={handleSignOut}>Yes, Sign Out</BlinButton>
            <BlinButton variant="ghost" className="w-full" onClick={() => setIsSignOutOpen(false)}>Cancel</BlinButton>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}

function GoogleSVG() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}
