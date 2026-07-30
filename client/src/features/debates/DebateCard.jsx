import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Users, MessageSquare } from 'lucide-react';
import { 
  StatusBadge, 
  CredibilityBadge, 
  CountdownTimer, 
  VoteBar 
} from '@/components/ui';

export const DebateCard = ({ debate }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card-dark rounded-xl border border-border-subtle p-5 hover:border-primary/40 transition-colors shadow-subtle group relative overflow-hidden"
    >
      {/* Glossy gradient top */}
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="flex flex-col gap-2">
          <StatusBadge status={debate.status} />
          <Link to={`/debates/${debate._id}`}>
            <h3 className="text-lg font-medium text-white group-hover:text-primary-bright transition-colors line-clamp-2">
              {debate.title}
            </h3>
          </Link>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-2">
          {debate.status === 'live' || debate.status === 'ending_soon' ? (
            <CountdownTimer targetDate={debate.lifecycle?.endsAt} />
          ) : (
            <span className="text-xs text-text-muted">Finished</span>
          )}
        </div>
      </div>

      <div className="mb-4 relative z-10">
        <p className="text-sm text-text-muted line-clamp-2">
          {debate.description}
        </p>
      </div>

      {/* Options and Votes */}
      <div className="space-y-3 mb-6 relative z-10">
        <VoteBar options={debate.options} totalVotes={debate.stats.totalVotes} />
        
        <div className="flex justify-between text-xs text-text-muted">
          {debate.options.map((opt, i) => {
             const pct = debate.stats.totalVotes > 0 
               ? Math.round((opt.votes / debate.stats.totalVotes) * 100) 
               : 0;
             return (
               <div key={opt._id} className="flex flex-col items-center max-w-[45%] text-center">
                 <span className="font-bold text-white mb-0.5 truncate w-full">{opt.label}</span>
                 <span style={{ color: opt.color || '#00C8FF' }}>{pct}%</span>
               </div>
             )
          })}
        </div>
      </div>

      {/* Footer metadata */}
      <div className="flex items-center justify-between border-t border-border-subtle pt-4 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-border-subtle overflow-hidden">
            {debate.creator?.profile?.avatar ? (
              <img src={debate.creator.profile.avatar} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-primary/20 flex items-center justify-center text-[10px] text-primary">
                {debate.creator?.username?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <span className="text-xs text-text-muted font-medium">{debate.creator?.username}</span>
          <CredibilityBadge score={debate.creator?.credibilityScore || 50} size="sm" />
        </div>

        <div className="flex items-center gap-4 text-xs text-text-muted">
          <div className="flex items-center gap-1.5">
            <Users size={14} />
            <span>{debate.stats?.totalVotes || 0}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MessageSquare size={14} />
            <span>{debate.stats?.totalComments || 0}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
