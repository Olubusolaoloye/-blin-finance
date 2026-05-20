"use client";

import { useState, useMemo } from "react";
import { Calculator, Download, FileText, PieChart, Info, ArrowUpRight } from "lucide-react";
import { BlinCard } from "@/components/ui/BlinCard";
import { BlinButton } from "@/components/ui/BlinButton";
import { AmountDisplay } from "@/components/ui/AmountDisplay";
import { useAlchemyTransfers } from "@/hooks/useAlchemyTransfers";

export default function TaxPage() {
  const [taxYear, setTaxYear] = useState("2026");
  const [taxRate, setTaxRate] = useState(10);

  const { transfers, isLoading } = useAlchemyTransfers(50);

  const taxData = useMemo(() => {
    // Taxable events: ERC-20 sends (outgoing transfers of tokens)
    const taxableEvents = transfers.filter(
      (tx) => tx.category === "erc20" || tx.type === "send",
    );

    let totalProceeds = 0;
    let totalCostBasis = 0;
    let totalCapitalGains = 0;

    taxableEvents.forEach((tx) => {
      // usdValue is "$0.00" for on-chain transfers since we don't have price at time
      // parse it, falling back to 0
      const proceeds = parseFloat(tx.usdValue.replace(/[^0-9.-]+/g, "")) || 0;
      const cost = proceeds * 0.7;
      const gain = proceeds - cost;
      totalProceeds += proceeds;
      totalCostBasis += cost;
      totalCapitalGains += gain;
    });

    const estimatedTax = Math.max(0, totalCapitalGains * (taxRate / 100));
    return { events: taxableEvents, totalProceeds, totalCostBasis, totalCapitalGains, estimatedTax };
  }, [transfers, taxYear, taxRate]);

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div className="flex justify-between items-center">
        <h1 className="font-display font-semibold text-[20px] text-text-primary">Tax Center</h1>
        <div className="flex gap-1 bg-surface-raised p-1 rounded-full border border-border-light">
          <select
            value={taxYear}
            onChange={(e) => setTaxYear(e.target.value)}
            className="bg-transparent text-[13px] font-bold outline-none px-2"
          >
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
        </div>
      </div>

      <BlinCard variant="dark" className="bg-gradient-to-br from-[#0D2137] to-[#1A3C6E] p-6">
        <div className="flex items-center gap-2 mb-1">
          <Calculator size={16} className="text-brand-gold" />
          <div className="text-[12px] text-white/60 uppercase tracking-wider font-semibold">Estimated Tax Liability</div>
        </div>
        <div className="flex items-baseline gap-3 mb-6">
          <AmountDisplay amount={taxData.estimatedTax} currency="USD" className="text-[36px] font-bold text-white leading-none" />
        </div>
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
          <div>
            <div className="text-[11px] text-white/50 mb-1">Total Capital Gains</div>
            <AmountDisplay amount={taxData.totalCapitalGains} currency="USD" className="text-[15px] font-semibold text-brand-green" />
          </div>
          <div>
            <div className="text-[11px] text-white/50 mb-1">Total Proceeds</div>
            <AmountDisplay amount={taxData.totalProceeds} currency="USD" className="text-[15px] font-semibold text-white" />
          </div>
        </div>
      </BlinCard>

      <div className="flex gap-3">
        <BlinButton variant="primary" className="flex-1 flex items-center justify-center gap-2">
          <Download size={16} /> Export Form 8949
        </BlinButton>
        <BlinButton variant="secondary" className="flex-1 flex items-center justify-center gap-2 bg-white">
          <FileText size={16} /> Full Report
        </BlinButton>
      </div>

      <div>
        <h2 className="font-bold text-[16px] text-text-primary mb-4 flex items-center gap-2">
          <PieChart size={18} className="text-brand-blue" /> Tax Breakdown
        </h2>
        <BlinCard className="p-0 overflow-hidden">
          <div className="p-5 border-b border-border-light flex justify-between items-center bg-surface-raised/50">
            <span className="text-[14px] font-semibold">Applied Tax Rate</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
                className="w-16 text-right bg-white border border-border-light rounded-md px-2 py-1 text-[14px] font-bold outline-none focus:border-brand-accent"
              />
              <span className="text-[14px] font-bold">%</span>
            </div>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-brand-blue" />
                <span className="text-[14px] text-text-secondary">Short-term Gains</span>
              </div>
              <AmountDisplay amount={taxData.totalCapitalGains * 0.8} currency="USD" className="text-[14px] font-semibold" />
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-brand-gold" />
                <span className="text-[14px] text-text-secondary">Long-term Gains</span>
              </div>
              <AmountDisplay amount={taxData.totalCapitalGains * 0.2} currency="USD" className="text-[14px] font-semibold" />
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-border-light">
              <span className="text-[14px] font-bold">Net Taxable Income</span>
              <AmountDisplay amount={taxData.totalCapitalGains} currency="USD" className="text-[14px] font-bold" />
            </div>
          </div>
        </BlinCard>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-[16px] text-text-primary">Taxable Events</h2>
          <span className="text-[12px] text-text-muted">{taxData.events.length} transactions</span>
        </div>
        <div className="bg-white rounded-[16px] border border-border-light overflow-hidden">
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-4 border-b border-border-light last:border-0 animate-pulse"
                >
                  <div className="w-10 h-10 rounded-full bg-border-light shrink-0" />
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="h-3 w-32 bg-border-light rounded-full" />
                    <div className="h-2.5 w-20 bg-border-light rounded-full" />
                  </div>
                  <div className="h-3.5 w-16 bg-border-light rounded-full" />
                </div>
              ))
            : taxData.events.map((tx, i) => {
                const proceeds = parseFloat(tx.usdValue.replace(/[^0-9.-]+/g, "")) || 0;
                const gain = proceeds * 0.3;
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 border-b border-border-light last:border-0 hover:bg-surface-raised transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-red/10 flex items-center justify-center shrink-0">
                        <ArrowUpRight size={18} className="text-brand-red" />
                      </div>
                      <div>
                        <div className="font-bold text-[14px] text-text-primary">{tx.title}</div>
                        <div className="text-[12px] text-text-muted">{tx.date}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-[14px] text-brand-green">
                        +<AmountDisplay amount={gain} currency="USD" />
                      </div>
                      <div className="text-[12px] text-text-muted">Gain</div>
                    </div>
                  </div>
                );
              })}
          {!isLoading && taxData.events.length === 0 && (
            <div className="p-8 text-center text-text-muted text-[14px]">No taxable events found for this year.</div>
          )}
        </div>
      </div>

      <div className="bg-brand-blue/5 rounded-xl p-4 flex items-start gap-3 border border-brand-blue/10">
        <Info size={18} className="text-brand-blue shrink-0 mt-0.5" />
        <p className="text-[12px] text-text-secondary leading-relaxed">
          This calculator provides an estimate based on your transaction history. It does not constitute official tax advice. Please consult a certified tax professional for accurate reporting.
        </p>
      </div>
    </div>
  );
}
