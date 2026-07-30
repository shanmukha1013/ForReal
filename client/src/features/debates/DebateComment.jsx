import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, ThumbsDown, MessageCircle, ShieldCheck, ChevronDown, ChevronUp, Trash2, Edit2, MoreHorizontal } from 'lucide-react';
import { CredibilityBadge, Avatar } from '@/components/ui';
import useDebateStore from '@/store/useDebateStore';
import apiClient from '@/services/api';
import useAuthStore from '@/store/useAuthStore';

export const DebateComment = React.memo(({ comment, debateOptions, debateId }) => {
  const { user } = useAuthStore();
  const isOwner = user?._id === (comment.author?._id || comment.author);

  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);

  const option = debateOptions.find(o => o._id === comment.optionId);

  const fetchReplies = useCallback(async () => {
    try {
      const response = await apiClient.get(`/debates/${debateId}/comments/${comment._id}/replies`);
      setReplies(response.data.replies || []);
    } catch (err) {
      console.error(err);
    }
  }, [debateId, comment._id]);

  const handleDelete = useCallback(async () => {
    if (!window.confirm('Delete this argument permanently?')) return;
    try {
      await apiClient.delete(`/debates/${debateId}/comments/${comment._id}`);
      window.location.reload(); // Simple fallback for now
    } catch (err) {
      console.error('Failed to delete comment', err);
    }
  }, [debateId, comment._id]);

  const handleEdit = useCallback(async () => {
    if (!editText.trim() || editText === comment.content) {
      setIsEditing(false);
      return;
    }
    try {
      await apiClient.put(`/debates/${debateId}/comments/${comment._id}`, { content: editText });
      comment.content = editText; // Optimistic update
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update comment', err);
    }
  }, [debateId, comment._id, comment.content, editText]);

  useEffect(() => {
    if (showReplies && replies.length === 0) {
      fetchReplies();
    }
  }, [showReplies, replies.length, fetchReplies]);

  const handlePostReply = useCallback(async () => {
    if (!replyText.trim()) return;
    setIsSubmitting(true);
    try {
      const newReply = await useDebateStore.getState().addComment(debateId, {
        content: replyText,
        parentComment: comment._id,
        optionId: comment.optionId // Default to same side or let them choose
      });
      setReplies((prev) => [...prev, newReply]);
      setReplyText('');
      setIsReplying(false);
      setShowReplies(true);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  }, [debateId, comment._id, comment.optionId, replyText]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card-dark border border-border-subtle rounded-xl p-4 flex gap-4"
    >
      <div className="shrink-0 flex flex-col items-center gap-2">
        <Avatar src={comment.author?.profile?.avatar} username={comment.author?.username} size="md" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1 relative">
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
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">
              {new Date(comment.createdAt).toLocaleDateString()}
            </span>
            {isOwner && (
              <div className="relative">
                <button 
                  onClick={() => setShowMenu(!showMenu)} 
                  className="p-1 text-text-muted hover:text-white transition-colors rounded-full hover:bg-white/5"
                >
                  <MoreHorizontal size={14} />
                </button>
                <AnimatePresence>
                  {showMenu && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="absolute right-0 top-6 w-32 bg-bg-dark border border-border-subtle rounded-lg shadow-xl z-10 overflow-hidden"
                    >
                      <button 
                        onClick={() => { setIsEditing(true); setShowMenu(false); }}
                        className="w-full text-left px-3 py-2 text-xs text-white hover:bg-white/5 flex items-center gap-2"
                      >
                        <Edit2 size={12} /> Edit
                      </button>
                      <button 
                        onClick={() => { handleDelete(); setShowMenu(false); }}
                        className="w-full text-left px-3 py-2 text-xs text-error hover:bg-error/10 flex items-center gap-2"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {isEditing ? (
          <div className="mb-3">
            <textarea 
              value={editText}
              onChange={e => setEditText(e.target.value)}
              className="w-full bg-bg-dark border border-border-subtle rounded-lg p-2 text-sm text-white focus:border-primary focus:outline-none min-h-[80px]"
            />
            <div className="flex justify-end gap-2 mt-2">
              <button onClick={() => setIsEditing(false)} className="text-xs px-3 py-1.5 text-text-muted hover:text-white">Cancel</button>
              <button onClick={handleEdit} className="text-xs px-3 py-1.5 bg-primary text-bg-dark font-bold rounded hover:bg-primary-hover">Save</button>
            </div>
          </div>
        ) : comment.content.startsWith('>') ? (
          <div className="mb-3">
            <div className="pl-3 border-l-2 border-primary/50 text-text-muted text-xs italic mb-2 py-1.5 bg-white/5 rounded-r">
              {comment.content.split('\n\n')[0].replace('> ', '')}
            </div>
            <p className="text-sm text-white/90 leading-relaxed">
              {comment.content.split('\n\n').slice(1).join('\n\n')}
            </p>
          </div>
        ) : (
          <p className="text-sm text-text-muted leading-relaxed mb-3">
            {comment.content}
          </p>
        )}

        {comment.isAiVerified && (
          <div className="flex items-center gap-1.5 text-xs text-success mb-3 bg-success/10 border border-success/20 px-2 py-1 rounded inline-flex">
            <ShieldCheck size={12} />
            <span>Fact Checked: {comment.factCheckScore}% Accuracy</span>
          </div>
        )}

        <div className="flex items-center gap-4 text-xs font-medium text-text-muted mt-3">
          <button className="flex items-center gap-1.5 hover:text-white transition-colors">
            <ThumbsUp size={14} />
            <span>{comment.reactionsCount?.like || 0}</span>
          </button>
          
          <button 
            onClick={() => setIsReplying(!isReplying)}
            className="flex items-center gap-1.5 hover:text-white transition-colors"
          >
            <MessageCircle size={14} />
            <span>Reply</span>
          </button>

          <button 
            onClick={() => {
              setReplyText(`> ${comment.content}\n\n`);
              setIsReplying(true);
            }}
            className="flex items-center gap-1.5 hover:text-white transition-colors"
          >
            <span>Quote</span>
          </button>

          {(comment.repliesCount > 0 || replies.length > 0) && (
            <button 
              onClick={() => setShowReplies(!showReplies)}
              className="flex items-center gap-1 hover:text-white transition-colors ml-auto"
            >
              {showReplies ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              <span>{Math.max(comment.repliesCount || 0, replies.length)} Replies</span>
            </button>
          )}
        </div>

        <AnimatePresence>
          {isReplying && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-border-subtle"
            >
              <div className="flex flex-col gap-2">
                <textarea 
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Draft a logical reply..."
                  className="w-full bg-bg-dark border border-border-muted rounded-lg px-3 py-2 text-sm text-white focus:border-primary focus:outline-none min-h-[80px]"
                />
                <div className="flex justify-end gap-2">
                  <button 
                    onClick={() => { setIsReplying(false); setReplyText(''); }}
                    className="text-xs px-3 py-1.5 text-text-muted hover:text-white"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handlePostReply}
                    disabled={isSubmitting || !replyText.trim()}
                    className="bg-primary text-bg-dark px-4 py-1.5 rounded text-xs font-bold hover:bg-primary-hover disabled:opacity-50"
                  >
                    Send Reply
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showReplies && replies.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 space-y-3 pl-4 border-l-2 border-border-subtle overflow-hidden"
            >
              {replies.map((reply, i) => (
                <motion.div 
                  key={reply._id} 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-bg-dark/80 border border-border-subtle rounded-xl p-4 flex gap-3 relative before:absolute before:-left-4 before:top-6 before:w-4 before:h-px before:bg-border-subtle"
                >
                  <div className="shrink-0 mt-1">
                    <Avatar src={reply.author?.profile?.avatar} username={reply.author?.username} size="sm" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs">{reply.author?.username}</span>
                        <CredibilityBadge score={reply.author?.credibilityScore || 50} size="sm" />
                      </div>
                      <span className="text-[10px] text-text-muted">{new Date(reply.createdAt).toLocaleDateString()}</span>
                    </div>
                    
                    {reply.content.startsWith('>') ? (
                      <div>
                        <div className="pl-3 border-l-2 border-primary/50 text-text-muted text-xs italic mb-2 py-1 bg-white/5 rounded-r">
                          {reply.content.split('\n\n')[0].replace('> ', '')}
                        </div>
                        <p className="text-sm text-white/90">{reply.content.split('\n\n').slice(1).join('\n\n')}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-white/90">{reply.content}</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
});
