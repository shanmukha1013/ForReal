import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Users, MessageSquare, Trash2 } from 'lucide-react';
import {
  StatusBadge,
  CredibilityBadge,
  CountdownTimer,
  VoteBar,
  Avatar
} from '@/components/ui';
import useAuthStore from '@/store/useAuthStore';
import useDebateStore from '@/store/useDebateStore';
import apiClient from '@/services/api';
import { toast } from 'react-hot-toast';

export const DebateCard = ({ debate, onDeleted }) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const isCreator = user?._id && debate?.creator?._id &&
    user._id.toString() === debate.creator._id.toString();

  const handleDelete = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('Permanently delete this debate and all arguments?')) return;
    try {
      await apiClient.delete(`/debates/${debate._id}`);
      toast.success('Debate deleted.');
      if (onDeleted) onDeleted(debate._id);
    } catch (err) {
      toast.error(err.message || 'Could not delete debate.');
    }
  }, [debate._id, onDeleted]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card-dark rounded-xl border border-border-subtle p-5 hover:border-primary/40 transition-colors shadow-subtle group relative overflow-hidden"
    >
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="flex flex-col gap-2 flex-1 min-w-0 pr-4">
          <StatusBadge status={debate.status} />
          <Link to={`/debates/${debate._id}`}>
            <h3 className="text-lg font-bold text-white group-hover:text-primary-bright transition-colors line-clamp-2 leading-snug">
              {debate.title}
            </h3>
          </Link>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-2">
          {debate.status === 'live' || debate.status === 'ending_soon' ? (
            <CountdownTimer targetDate={debate.lifecycle?.endsAt} />
          ) : (
            <span className="text-xs text-text-muted font-medium">Concluded</span>
          )}
          {isCreator && (
            <button
              onClick={handleDelete}
              className="p-1.5 text-text-muted hover:text-error hover:bg-error/10 rounded-lg transition-colors"
              aria-label="Delete debate"
              title="Delete this debate"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="mb-4 relative z-10">
        <p className="text-sm text-text-muted line-clamp-2 leading-relaxed">
          {debate.description}
        </p>
      </div>

      <div className="space-y-3 mb-6 relative z-10">
        <VoteBar options={debate.options} totalVotes={debate.stats.totalVotes} />
        <div className="flex justify-between text-xs text-text-muted">
          {debate.options.map((opt) => {
            const pct = debate.stats.totalVotes > 0
              ? Math.round((opt.votes / debate.stats.totalVotes) * 100)
              : 0;
            return (
              <div key={opt._id} className="flex flex-col items-center max-w-[45%] text-center">
                <span className="font-bold text-white mb-0.5 truncate w-full">{opt.label}</span>
                <span style={{ color: opt.color || '#00C8FF' }}>{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border-subtle pt-4 relative z-10">
        <div className="flex items-center gap-2">
          <Avatar src={debate.creator?.profile?.avatar} username={debate.creator?.username} size="sm" />
          <span className="text-xs text-text-muted font-medium">{debate.creator?.username}</span>
          <CredibilityBadge score={debate.creator?.credibilityScore || 50} size="sm" />
        </div>

        <div className="flex items-center gap-4 text-xs text-text-muted">
          <div className="flex items-center gap-1.5">
            <Users size={13} />
            <span>{debate.stats?.totalVotes || 0}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MessageSquare size={13} />
            <span>{debate.stats?.totalComments || 0}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
