import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Zap, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { ProgressRing } from '@/components/ui';

export const AIAnalysisPanel = ({ analysis }) => {
  if (!analysis) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface rounded-xl border border-primary/20 p-6 mb-6 shadow-glow relative overflow-hidden"
    >
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[80px] rounded-full pointer-events-none" />
      
      <div className="flex items-center gap-2 mb-6 relative z-10">
        <Brain className="text-primary" size={24} />
        <h3 className="text-lg font-bold text-white tracking-wide">Logic Engine Analysis</h3>
      </div>

      <div className="grid md:grid-cols-3 gap-6 relative z-10">
        <div className="md:col-span-2 space-y-6">
          <div>
            <h4 className="text-xs font-bold text-primary-bright uppercase tracking-widest mb-2">Summary</h4>
            <p className="text-sm text-text-muted leading-relaxed">
              {analysis.summary || "The logic engine is currently gathering data on this debate."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-bold text-success uppercase tracking-widest mb-2 flex items-center gap-1">
                <CheckCircle2 size={12} /> Key Arguments
              </h4>
              <ul className="space-y-1">
                {analysis.keyArguments?.map((arg, i) => (
                  <li key={i} className="text-xs text-white bg-bg-dark rounded p-2 border border-border-subtle">{arg}</li>
                )) || <li className="text-xs text-text-muted">No data yet.</li>}
              </ul>
            </div>
            
            <div>
              <h4 className="text-xs font-bold text-error uppercase tracking-widest mb-2 flex items-center gap-1">
                <ShieldAlert size={12} /> Logical Fallacies Detected
              </h4>
              <ul className="space-y-1">
                {analysis.logicalFallacies?.map((fallacy, i) => (
                  <li key={i} className="text-xs text-white bg-error/10 text-error rounded p-2 border border-error/20">{fallacy}</li>
                )) || <li className="text-xs text-text-muted">None detected.</li>}
              </ul>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-l border-border-subtle pl-6">
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Consensus</span>
            <ProgressRing progress={analysis.consensusLevel || 0} size={80} color="text-primary" />
          </div>
          
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Sentiment</span>
            <div className="w-full bg-bg-dark h-2 rounded-full overflow-hidden mt-1">
               <div 
                 className="h-full bg-gradient-to-r from-error via-warning to-success"
                 style={{ width: `${analysis.sentimentScore || 50}%` }}
               />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
