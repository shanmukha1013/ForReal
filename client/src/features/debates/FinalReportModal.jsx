import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Award, BrainCircuit, Users } from 'lucide-react';
import { AnimatedButton, ProgressRing } from '@/components/ui';

export const FinalReportModal = ({ isOpen, onClose, debate }) => {
  if (!isOpen || !debate || !debate.finalVerdict) return null;

  const { finalVerdict } = debate;
  const winningOption = debate.options.find(o => o._id === finalVerdict.winningOptionId);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#020202]/90 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-2xl bg-surface border border-primary/30 shadow-[0_0_50px_rgba(0,200,255,0.15)] rounded-2xl overflow-hidden my-8"
        >
          {/* Header */}
          <div className="bg-primary/10 p-6 border-b border-primary/20 flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-black text-white flex items-center gap-2 mb-1">
                <Award className="text-primary" />
                Final Verdict Report
              </h2>
              <p className="text-sm text-text-muted">Debate concluded on {new Date(debate.lifecycle.finishedAt).toLocaleDateString()}</p>
            </div>
            <button onClick={onClose} className="text-text-muted hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>

          <div className="p-8">
            {/* The Winner */}
            <div className="text-center mb-10">
              <span className="text-sm font-bold text-primary tracking-widest uppercase mb-2 block">
                Community & Logic Consensus
              </span>
              <div 
                className="inline-block px-6 py-3 rounded-xl border-2 font-black text-3xl shadow-glow"
                style={{ 
                  borderColor: winningOption?.color || '#00C8FF',
                  color: winningOption?.color || '#00C8FF',
                  backgroundColor: `${winningOption?.color || '#00C8FF'}10` 
                }}
              >
                {winningOption?.label || "No Clear Winner"}
              </div>
            </div>

            {/* AI Verdict */}
            <div className="bg-bg-dark rounded-xl p-6 border border-border-subtle relative overflow-hidden mb-8">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[50px] rounded-full" />
              <h4 className="flex items-center gap-2 text-white font-bold mb-3 relative z-10">
                <BrainCircuit className="text-primary" />
                AI Logic Engine Conclusion
              </h4>
              <p className="text-sm text-text-muted leading-relaxed relative z-10">
                {finalVerdict.aiVerdict}
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-bg-dark p-6 rounded-xl border border-border-subtle flex flex-col items-center justify-center">
                <Users className="text-primary mb-2" size={32} />
                <span className="text-3xl font-black text-white">{debate.stats.totalVotes}</span>
                <span className="text-xs text-text-muted uppercase tracking-widest mt-1">Total Votes</span>
              </div>
              
              <div className="bg-bg-dark p-6 rounded-xl border border-border-subtle flex flex-col items-center justify-center">
                <ProgressRing progress={finalVerdict.confidence || 0} size={64} color="text-primary" />
                <span className="text-xs text-text-muted uppercase tracking-widest mt-3">AI Confidence</span>
              </div>
            </div>

          </div>

          <div className="p-6 bg-bg-dark border-t border-border-subtle flex justify-center">
            <AnimatedButton onClick={onClose} variant="primary" className="w-full sm:w-auto px-12">
              Close Report
            </AnimatedButton>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
