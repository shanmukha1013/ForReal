import React from 'react';
import { motion } from 'framer-motion';
import { AnimatedButton, ProgressRing } from '@/components/ui';
import useDebateStore from '@/store/useDebateStore';
import { toast } from 'react-hot-toast';

export const VotePanel = ({ debate, userVote }) => {
  const { vote } = useDebateStore();

  const handleVote = async (optionId) => {
    try {
      await vote(debate._id, optionId);
      toast.success('Vote recorded');
    } catch (error) {
      toast.error(error.message || 'Failed to vote');
    }
  };

  const totalVotes = debate.stats.totalVotes;

  return (
    <div className="bg-card-dark rounded-xl border border-border-subtle p-6 mb-6">
      <h3 className="text-lg font-bold text-white mb-4">Cast Your Vote</h3>
      <div className="grid gap-4 md:grid-cols-2">
        {debate.options.map(option => {
          const isSelected = userVote?.optionId === option._id;
          const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
          
          return (
            <motion.div
              key={option._id}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => handleVote(option._id)}
              className={`relative cursor-pointer overflow-hidden rounded-xl border p-4 transition-all ${
                isSelected 
                  ? 'border-primary bg-primary/10 shadow-[0_0_15px_rgba(0,200,255,0.15)]' 
                  : 'border-border-muted bg-bg-dark hover:border-primary/50'
              }`}
            >
              {isSelected && (
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent pointer-events-none" />
              )}
              
              <div className="flex justify-between items-center relative z-10">
                <div>
                  <h4 className={`font-bold text-lg ${isSelected ? 'text-primary-bright' : 'text-white'}`}>
                    {option.label}
                  </h4>
                  <p className="text-sm text-text-muted mt-1">{option.votes} votes</p>
                </div>
                <ProgressRing 
                  progress={percentage} 
                  size={48} 
                  strokeWidth={4} 
                  color={isSelected ? 'text-primary' : 'text-border-muted'}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
