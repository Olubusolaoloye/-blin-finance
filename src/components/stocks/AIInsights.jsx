import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, AlertCircle } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { BlinCard } from '../ui/BlinCard';
import { SkeletonLoader } from '../ui/SkeletonLoader';

export function AIInsights() {
  const [insight, setInsight] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchInsights() {
      try {
        setLoading(true);
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: 'Provide a brief, 2-paragraph market insight on the current state of US tech stocks and African equities. Keep it professional, concise, and formatted as plain text without markdown headers. Focus on recent trends.',
          config: {
            temperature: 0.7,
          }
        });
        setInsight(response.text);
      } catch (err) {
        console.error('Failed to fetch AI insights:', err);
        setError('Unable to load latest market insights at this time.');
      } finally {
        setLoading(false);
      }
    }

    fetchInsights();
  }, []);

  return (
    <BlinCard className="bg-gradient-to-br from-[#F8FAFC] to-[#F1F5F9] border-brand-accent/20 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-brand-accent/10 flex items-center justify-center">
          <Sparkles size={16} className="text-brand-accent" />
        </div>
        <h3 className="font-display font-bold text-[16px] text-text-primary">AI Market Insights</h3>
      </div>
      
      {loading ? (
        <div className="space-y-2">
          <SkeletonLoader shape="line" className="w-full h-4" />
          <SkeletonLoader shape="line" className="w-[90%] h-4" />
          <SkeletonLoader shape="line" className="w-[95%] h-4" />
          <SkeletonLoader shape="line" className="w-[80%] h-4" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 text-brand-red text-[13px] bg-brand-red/10 p-3 rounded-lg">
          <AlertCircle size={16} />
          {error}
        </div>
      ) : (
        <div className="text-[14px] text-text-secondary leading-relaxed space-y-3">
          {insight.split('\n\n').map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      )}
      
      <div className="mt-4 pt-3 border-t border-border-light flex items-center justify-between">
        <span className="text-[11px] text-text-muted uppercase tracking-wider font-semibold">Powered by Gemini</span>
        <button className="text-[12px] font-bold text-brand-accent hover:underline flex items-center gap-1">
          <TrendingUp size={14} /> View Full Report
        </button>
      </div>
    </BlinCard>
  );
}
