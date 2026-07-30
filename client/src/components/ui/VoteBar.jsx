import React from 'react';
import { motion } from 'framer-motion';

export const VoteBar = ({ options, totalVotes }) => {
  // Normalize options to ensure they sum to 100% in UI visually
  return (
    <div className="w-full flex h-2 rounded-full overflow-hidden bg-bg-dark border border-border-subtle/50 shadow-inner">
      {options.map((option, idx) => {
        const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
        return (
          <motion.div
            key={option._id || idx}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full relative"
            style={{ 
              backgroundColor: option.color || '#00C8FF',
              boxShadow: percentage > 0 ? `0 0 10px ${option.color || '#00C8FF'}` : 'none'
            }}
            title={`${option.label}: ${Math.round(percentage)}%`}
          >
            {/* Glossy overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
          </motion.div>
        );
      })}
    </div>
  );
};
