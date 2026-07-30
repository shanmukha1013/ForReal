import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ProgressRing } from '@/components/ui';
import useDebateStore from '@/store/useDebateStore';
import { toast } from 'react-hot-toast';
import { CheckCircle2 } from 'lucide-react';

export const VotePanel = ({ debate }) => {
  const { vote } = useDebateStore();
  const [isVoting, setIsVoting] = useState(false);
  const [votedOptionId, setVotedOptionId] = useState(null);

  const handleVote = async (optionId) => {
    if (isVoting) return;
    setIsVoting(true);
    // Optimistic
    const prev = votedOptionId;
    setVotedOptionId(optionId);
    try {
      await vote(debate._id, optionId);
      toast.success('Your vote is on the record.');
    } catch (error) {
      setVotedOptionId(prev);
      toast.error(error.message || 'Could not cast vote. Try again.');
    } finally {
      setIsVoting(false);
    }
  };

  const totalVotes = debate.stats?.totalVotes || 0;
  const canVote = debate.status === 'live' || debate.status === 'ending_soon';

  return (
    <div className="bg-card-dark rounded-xl border border-border-subtle p-6 mb-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-bold text-white">Choose Your Side</h3>
        <span className="text-xs text-text-muted font-medium">
          {totalVotes} vote{totalVotes !== 1 ? 's' : ''} cast
        </span>
      </div>

      {!canVote && (
        <p className="text-sm text-text-muted mb-4 italic">
          This debate has concluded. Results are final.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {debate.options.map(option => {
          const isSelected = votedOptionId === option._id;
          const percentage = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;

          return (
            <motion.button
              key={option._id}
              whileHover={canVote ? { scale: 1.01, y: -1 } : {}}
              whileTap={canVote ? { scale: 0.99 } : {}}
              onClick={() => canVote && handleVote(option._id)}
              disabled={!canVote || isVoting}
              className={`relative cursor-pointer overflow-hidden rounded-xl border p-5 transition-all text-left w-full ${
                isSelected
                  ? 'border-primary bg-primary/10 shadow-[0_0_20px_rgba(0,200,255,0.2)]'
                  : canVote
                    ? 'border-border-muted bg-bg-dark hover:border-primary/50 hover:bg-primary/5'
                    : 'border-border-subtle bg-bg-dark opacity-80 cursor-default'
              }`}
            >
              {isSelected && (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
              )}

              <div className="flex justify-between items-center relative z-10">
                <div className="flex-1 min-w-0 pr-3">
                  <div className="flex items-center gap-2 mb-1">
                    {isSelected && (
                      <CheckCircle2 size={15} className="text-primary shrink-0" />
                    )}
                    <h4
                      className={`font-bold text-base truncate ${isSelected ? 'text-primary' : 'text-white'}`}
                      style={!isSelected && option.color ? { color: option.color } : {}}
                    >
                      {option.label}
                    </h4>
                  </div>
                  <div className="mt-2">
                    <div className="h-1.5 bg-border-subtle rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: option.color || '#00C8FF' }}
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                      />
                    </div>
                    <p className="text-xs text-text-muted mt-1 font-medium">
                      {option.votes} votes · {percentage}%
                    </p>
                  </div>
                </div>
                <ProgressRing
                  progress={percentage}
                  size={44}
                  strokeWidth={3}
                  color={isSelected ? 'text-primary' : 'text-border-muted'}
                />
              </div>
            </motion.button>
          );
        })}
      </div>

      {votedOptionId && (
        <p className="text-xs text-text-muted text-center mt-4">
          You can change your vote at any time while the debate is live.
        </p>
      )}
    </div>
  );
};
