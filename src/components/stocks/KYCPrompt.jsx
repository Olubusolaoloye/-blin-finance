import React from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, FileText, CheckCircle } from 'lucide-react';
import { BlinCard } from '../ui/BlinCard';
import { BlinButton } from '../ui/BlinButton';
import { useNavigate } from 'react-router-dom';

export function KYCPrompt({ onVerify }) {
  const navigate = useNavigate();

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-10 px-4"
    >
      <BlinCard className="max-w-md w-full text-center border-brand-gold/30 bg-gradient-to-br from-[#FFFDF5] to-white shadow-lg">
        <div className="w-16 h-16 bg-brand-gold/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldAlert size={32} className="text-brand-gold" />
        </div>
        
        <h2 className="font-display font-bold text-[24px] text-text-primary mb-3">
          Verification Required
        </h2>
        
        <p className="text-[15px] text-text-secondary mb-8 leading-relaxed">
          To comply with regulatory requirements and ensure the security of your account, please complete your KYC verification before trading stocks.
        </p>

        <div className="space-y-4 mb-8 text-left">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-brand-green/10 flex items-center justify-center shrink-0 mt-0.5">
              <FileText size={14} className="text-brand-green" />
            </div>
            <div>
              <div className="font-semibold text-[14px] text-text-primary">Identity Document</div>
              <div className="text-[12px] text-text-muted">Passport, Driver's License, or National ID</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-brand-green/10 flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle size={14} className="text-brand-green" />
            </div>
            <div>
              <div className="font-semibold text-[14px] text-text-primary">Facial Verification</div>
              <div className="text-[12px] text-text-muted">A quick selfie to confirm your identity</div>
            </div>
          </div>
        </div>

        <BlinButton variant="primary" className="w-full mb-3" onClick={onVerify}>
          Start Verification
        </BlinButton>
        <button 
          onClick={() => navigate('/dashboard')}
          className="text-[14px] font-semibold text-text-muted hover:text-text-primary transition-colors"
        >
          Return to Dashboard
        </button>
      </BlinCard>
    </motion.div>
  );
}
