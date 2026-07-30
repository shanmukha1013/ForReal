import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, ThumbsDown, MessageCircle, ShieldCheck } from 'lucide-react';
import { CredibilityBadge } from '@/components/ui';

export const DebateComment = ({ comment, debateOptions }) => {
  const [isReplying, setIsReplying] = useState(false);
  const option = debateOptions.find(o => o._id === comment.optionId);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card-dark border border-border-subtle rounded-xl p-4 flex gap-4"
    >
      <div className="shrink-0 flex flex-col items-center gap-2">
        <div className="w-10 h-10 rounded-full bg-border-subtle overflow-hidden">
          {comment.author?.profile?.avatar ? (
            <img src={comment.author.profile.avatar} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-primary/20 flex items-center justify-center font-bold text-primary">
              {comment.author?.username?.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm">{comment.author?.username}</span>
            <CredibilityBadge score={comment.author?.credibilityScore || 50} size="sm" />
            
            {option && (
              <span 
                className="text-[10px] px-2 py-0.5 rounded-full font-bold border"
                style={{ 
                  color: option.color || '#00C8FF', 
                  borderColor: `${option.color || '#00C8FF'}40`,
                  backgroundColor: `${option.color || '#00C8FF'}10`
                }}
              >
                Supporting: {option.label}
              </span>
            )}
          </div>
          <span className="text-xs text-text-muted">
            {new Date(comment.createdAt).toLocaleDateString()}
          </span>
        </div>

        <p className="text-sm text-text-muted leading-relaxed mb-3">
          {comment.content}
        </p>

        {comment.isAiVerified && (
          <div className="flex items-center gap-1.5 text-xs text-success mb-3 bg-success/10 border border-success/20 px-2 py-1 rounded inline-flex">
            <ShieldCheck size={12} />
            <span>Fact Checked: {comment.factCheckScore}% Accuracy</span>
          </div>
        )}

        <div className="flex items-center gap-4 text-xs font-medium text-text-muted">
          <button className="flex items-center gap-1.5 hover:text-white transition-colors">
            <ThumbsUp size={14} />
            <span>{comment.reactionsCount?.like || 0}</span>
          </button>
          <button className="flex items-center gap-1.5 hover:text-white transition-colors">
            <ThumbsDown size={14} />
          </button>
          <button 
            onClick={() => setIsReplying(!isReplying)}
            className="flex items-center gap-1.5 hover:text-white transition-colors ml-auto"
          >
            <MessageCircle size={14} />
            <span>Reply</span>
          </button>
        </div>

        <AnimatePresence>
          {isReplying && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-border-subtle"
            >
              {/* Reply box would go here */}
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Draft a logical reply..."
                  className="flex-1 bg-bg-dark border border-border-muted rounded-lg px-3 py-2 text-sm text-white focus:border-primary focus:outline-none"
                />
                <button className="bg-primary text-bg-dark px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary-hover">
                  Send
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
