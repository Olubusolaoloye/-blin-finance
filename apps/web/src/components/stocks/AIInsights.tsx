"use client";

import { Sparkles, TrendingUp } from "lucide-react";
import { BlinCard } from "@/components/ui/BlinCard";

export function AIInsights() {
  const insight = `US tech stocks showed resilience this week with the Nasdaq climbing 1.8%, driven by strong earnings beats from semiconductor and cloud infrastructure companies. AI-related spending continues to accelerate across enterprise customers, suggesting sustained demand through the remainder of the year.

African equity markets saw mixed performance as Nigeria's NGX All-Share Index gained 0.6% on positive sentiment around oil production recovery, while Kenya's NSE 20 dipped slightly on currency pressure. Long-term fundamentals remain attractive for patient investors in the region.`;

  return (
    <BlinCard className="bg-gradient-to-br from-[#F8FAFC] to-[#F1F5F9] border-brand-accent/20 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-brand-accent/10 flex items-center justify-center">
          <Sparkles size={16} className="text-brand-accent" />
        </div>
        <h3 className="font-display font-bold text-[16px] text-text-primary">AI Market Insights</h3>
      </div>

      <div className="text-[14px] text-text-secondary leading-relaxed space-y-3">
        {insight.split("\n\n").map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-border-light flex items-center justify-between">
        <span className="text-[11px] text-text-muted uppercase tracking-wider font-semibold">
          Powered by Gemini
        </span>
        <button className="text-[12px] font-bold text-brand-accent hover:underline flex items-center gap-1">
          <TrendingUp size={14} /> View Full Report
        </button>
      </div>
    </BlinCard>
  );
}
