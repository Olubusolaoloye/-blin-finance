"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { Copy, ArrowRight, CheckCircle2, Building2, Smartphone } from "lucide-react";
import { BlinButton } from "@/components/ui/BlinButton";
import { BlinCard } from "@/components/ui/BlinCard";

export default function FiatPage() {
  const router = useRouter();
  const [activeTab, setActiveTab]     = useState("Add");
  const [amount, setAmount]           = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank");
  const [step, setStep]               = useState<"input" | "pending" | "success">("input");

  const handleAction = () => {
    setStep("pending");
    setTimeout(() => setStep("success"), 3000);
  };

  return (
    <div className="flex flex-col items-center max-w-[560px] mx-auto w-full pb-10">

      {/* Header */}
      <div className="w-full flex justify-between items-center mb-6">
        <h1 className="font-display font-semibold text-[20px]">Add &amp; Withdraw</h1>
      </div>

      {/* Tab Switcher */}
      <div className="flex w-full border-b border-border-light relative mb-8">
        <button
          onClick={() => { setActiveTab("Add"); setStep("input"); setAmount(""); }}
          className={`flex-1 py-3 text-[15px] font-semibold transition-colors ${activeTab === "Add" ? "text-brand-blue" : "text-text-muted hover:text-text-primary"}`}
        >
          Add NGN
        </button>
        <button
          onClick={() => { setActiveTab("Withdraw"); setStep("input"); setAmount(""); }}
          className={`flex-1 py-3 text-[15px] font-semibold transition-colors ${activeTab === "Withdraw" ? "text-brand-blue" : "text-text-muted hover:text-text-primary"}`}
        >
          Withdraw NGN
        </button>
        <motion.div
          className="absolute bottom-0 h-[2px] bg-brand-blue"
          initial={false}
          animate={{ left: activeTab === "Add" ? "0%" : "50%", width: "50%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "Add" ? (
          <motion.div key="Add" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="w-full flex flex-col gap-6">

            {step === "input" && (
              <>
                <div className="flex items-center justify-between bg-surface-raised p-4 rounded-2xl border border-border-light">
                  <div className="flex items-center gap-3">
                    <div className="text-[24px]">🇳🇬</div>
                    <div>
                      <div className="font-semibold text-[16px]">Nigerian Naira (NGN)</div>
                      <div className="text-[12px] text-text-muted">Rate: ₦1,580 = $1 · Updated 3m ago</div>
                    </div>
                  </div>
                </div>

                <div className="bg-surface-raised rounded-2xl p-6 border border-border-light focus-within:border-brand-accent transition-colors">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-display font-semibold text-[40px] text-text-muted">₦</span>
                    <input
                      type="text"
                      placeholder="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                      className="bg-transparent font-display font-semibold text-[40px] w-full outline-none text-text-primary placeholder:text-text-muted"
                    />
                  </div>

                  {amount && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl p-4 mt-4 shadow-sm border border-border-light">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[14px] text-text-secondary">You receive:</span>
                        <span className="font-bold text-[16px] text-brand-green">{(parseInt(amount) / 1580).toFixed(2)} USDT</span>
                      </div>
                      <div className="flex justify-between items-center text-[12px] text-text-muted">
                        <span>Fee: 1% (₦{(parseInt(amount) * 0.01).toLocaleString()})</span>
                        <span>After fee: ${(parseInt(amount) * 0.99 / 1580).toFixed(2)}</span>
                      </div>
                    </motion.div>
                  )}
                </div>

                <div>
                  <div className="text-[14px] font-semibold text-text-primary mb-3">Pay via</div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: "bank",  icon: Building2,  label: "Bank Transfer", time: "3–5 min" },
                      { id: "opay",  icon: Smartphone, label: "OPay",          time: "Instant" },
                      { id: "momo",  icon: Smartphone, label: "MTN MoMo",      time: "Instant" },
                    ].map((method) => (
                      <button
                        key={method.id}
                        onClick={() => setPaymentMethod(method.id)}
                        className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${paymentMethod === method.id ? "border-brand-accent bg-brand-accent/5" : "border-border-light bg-white hover:border-border-medium"}`}
                      >
                        <method.icon size={24} className={paymentMethod === method.id ? "text-brand-accent" : "text-text-muted"} />
                        <span className={`font-semibold text-[13px] mt-2 mb-1 ${paymentMethod === method.id ? "text-brand-accent" : "text-text-primary"}`}>{method.label}</span>
                        <span className="text-[11px] text-text-muted">{method.time}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <BlinButton className="w-full mt-4" disabled={!amount || parseInt(amount) < 1000} onClick={handleAction}>
                  Generate Payment Link
                </BlinButton>
              </>
            )}

            {step === "pending" && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center text-center py-10">
                <div className="w-16 h-16 rounded-full bg-brand-gold/10 flex items-center justify-center mb-6">
                  <div className="w-8 h-8 rounded-full border-4 border-brand-gold/30 border-t-brand-gold animate-spin" />
                </div>
                <h2 className="font-display font-semibold text-[24px] mb-2">Waiting for payment...</h2>
                <p className="text-[15px] text-text-secondary mb-8">Please complete the transfer using the link below.</p>

                <BlinCard accentLeft accentColor="var(--brand-gold)" className="w-full mb-8 text-left">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[12px] text-text-secondary uppercase font-semibold">Reference</span>
                    <span className="text-[12px] font-bold text-brand-red">Expires in 23:47</span>
                  </div>
                  <div className="flex justify-between items-center bg-surface-raised p-3 rounded-lg">
                    <span className="font-mono font-bold text-[16px]">BLIN-2847-AB3F</span>
                    <button className="text-brand-accent"><Copy size={18} /></button>
                  </div>
                </BlinCard>

                <div className="flex flex-col gap-3 w-full">
                  <BlinButton className="w-full bg-brand-navy">Open Payment Link <ArrowRight size={16} className="ml-2" /></BlinButton>
                  <BlinButton variant="ghost" className="w-full" onClick={() => setStep("input")}>Cancel</BlinButton>
                </div>
              </motion.div>
            )}

            {step === "success" && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center text-center py-10">
                <div className="w-20 h-20 rounded-full bg-brand-green/10 flex items-center justify-center mb-6 text-brand-green">
                  <CheckCircle2 size={40} />
                </div>
                <h2 className="font-display font-semibold text-[28px] mb-2">₦{parseInt(amount).toLocaleString()} received!</h2>
                <p className="text-[16px] text-text-secondary mb-10">{(parseInt(amount) / 1580).toFixed(2)} USDT added to your wallet</p>
                <div className="flex flex-col gap-3 w-full">
                  <BlinButton className="w-full" onClick={() => router.push("/dashboard")}>View Balance</BlinButton>
                  <BlinButton variant="ghost" className="w-full" onClick={() => { setStep("input"); setAmount(""); }}>Add More</BlinButton>
                </div>
              </motion.div>
            )}

          </motion.div>
        ) : (
          <motion.div key="Withdraw" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="w-full flex flex-col gap-6">

            <div className="bg-surface-raised rounded-2xl p-6 border border-border-light focus-within:border-brand-accent transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-display font-semibold text-[40px] text-text-muted">$</span>
                <input
                  type="text"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                  className="bg-transparent font-display font-semibold text-[40px] w-full outline-none text-text-primary placeholder:text-text-muted"
                />
              </div>

              {amount && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl p-4 mt-4 shadow-sm border border-border-light">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[14px] text-text-secondary">You receive:</span>
                    <span className="font-bold text-[16px] text-brand-green">₦{(parseFloat(amount) * 1580).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-[12px] text-text-muted">
                    <span>Fee: 1% (${(parseFloat(amount) * 0.01).toFixed(2)})</span>
                    <span>After fee: ₦{(parseFloat(amount) * 0.99 * 1580).toLocaleString()}</span>
                  </div>
                </motion.div>
              )}
            </div>

            <BlinCard className="p-5">
              <h3 className="font-bold text-[16px] mb-4">Bank Details</h3>
              <div className="space-y-4">
                <div className="relative">
                  <select className="w-full h-14 bg-surface-raised rounded-xl px-4 font-body text-[15px] outline-none border border-border-light focus:border-brand-accent appearance-none">
                    <option value="">Select Bank</option>
                    <option value="gtb">Guaranty Trust Bank</option>
                    <option value="zenith">Zenith Bank</option>
                    <option value="access">Access Bank</option>
                    <option value="kuda">Kuda Bank</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">▼</div>
                </div>

                <div className="relative">
                  <input type="text" placeholder="Account Number" maxLength={10} className="w-full h-14 bg-surface-raised rounded-xl px-4 font-body text-[15px] outline-none border border-border-light focus:border-brand-accent" />
                  <button className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-brand-navy text-white rounded-lg text-[12px] font-bold">Verify</button>
                </div>

                <div className="flex items-center gap-2 bg-[#D1FAE5]/30 p-3 rounded-xl border border-[#D1FAE5]">
                  <CheckCircle2 size={16} className="text-brand-green" />
                  <span className="font-semibold text-[14px] text-text-primary">Amara Okonkwo</span>
                </div>
              </div>
            </BlinCard>

            <BlinButton className="w-full mt-4" disabled={!amount || parseFloat(amount) < 1}>
              Withdraw to Bank
            </BlinButton>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
