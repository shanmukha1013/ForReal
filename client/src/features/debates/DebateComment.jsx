import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ThumbsUp, ThumbsDown, MessageCircle, ShieldCheck,
  ChevronDown, ChevronUp, Trash2, Edit2, MoreHorizontal, Quote
} from 'lucide-react';
import { CredibilityBadge, Avatar } from '@/components/ui';
import useDebateStore from '@/store/useDebateStore';
import apiClient from '@/services/api';
import useAuthStore from '@/store/useAuthStore';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';

const formatTime = (dateString) => {
  const now = new Date();
  const date = new Date(dateString);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const ReplyItem = ({ reply, debateId, currentUserId, onDelete }) => {
  const isOwner = currentUserId && reply?.author &&
    currentUserId.toString() === (reply.author._id || reply.author).toString();

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-bg-dark/80 border border-border-subtle rounded-xl p-3 flex gap-3 relative"
    >
      <div className="shrink-0">
        <Avatar src={reply.author?.profile?.avatar} username={reply.author?.username} size="sm" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Link to={`/profile/${reply.author?.username}`} className="font-bold text-white text-xs hover:text-primary transition-colors">
              {reply.author?.username}
            </Link>
            <CredibilityBadge score={reply.author?.credibilityScore || 50} size="sm" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-text-muted">{formatTime(reply.createdAt)}</span>
            {isOwner && (
              <button
                onClick={() => onDelete(reply._id)}
                className="text-text-muted hover:text-error transition-colors p-0.5 rounded"
                aria-label="Delete reply"
              >
                <Trash2 size={11} />
              </button>
            )}
          </div>
        </div>
        {reply.content?.startsWith('>') ? (
          <div>
            <div className="pl-3 border-l-2 border-primary/40 text-text-muted text-xs italic mb-1.5 py-1 bg-white/5 rounded-r">
              {reply.content.split('\n\n')[0].replace('> ', '')}
            </div>
            <p className="text-sm text-white/90">{reply.content.split('\n\n').slice(1).join('\n\n')}</p>
          </div>
        ) : (
          <p className="text-sm text-white/90">{reply.content}</p>
        )}
      </div>
    </motion.div>
  );
};

export const DebateComment = React.memo(({ comment, debateOptions, debateId, onDelete }) => {
  const { user } = useAuthStore();
  const currentUserId = user?._id;
  const isOwner = currentUserId && comment?.author &&
    currentUserId.toString() === (comment.author._id || comment.author).toString();

  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState([]);
  const [repliesLoaded, setRepliesLoaded] = useState(false);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const [localContent, setLocalContent] = useState(comment.content);

  const option = debateOptions?.find(o => o._id?.toString() === comment.optionId?.toString());

  const fetchReplies = useCallback(async () => {
    if (repliesLoaded) return;
    try {
      const response = await apiClient.get(`/debates/${debateId}/comments/${comment._id}/replies`);
      setReplies(response.data?.replies || []);
      setRepliesLoaded(true);
    } catch (err) {
      console.error('Failed to fetch replies', err);
    }
  }, [debateId, comment._id, repliesLoaded]);

  useEffect(() => {
    if (showReplies && !repliesLoaded) {
      fetchReplies();
    }
  }, [showReplies, repliesLoaded, fetchReplies]);

  const handleDeleteSelf = useCallback(async () => {
    if (!window.confirm('Delete this argument permanently?')) return;
    onDelete?.(comment._id);
  }, [comment._id, onDelete]);

  const handleDeleteReply = useCallback(async (replyId) => {
    if (!window.confirm('Delete this reply?')) return;
    try {
      await apiClient.delete(`/debates/${debateId}/comments/${replyId}`);
      setReplies(prev => prev.filter(r => r._id !== replyId));
      toast.success('Reply removed.');
    } catch (err) {
      toast.error('Could not delete reply.');
    }
  }, [debateId]);

  const handleEdit = useCallback(async () => {
    if (!editText.trim() || editText === localContent) {
      setIsEditing(false);
      return;
    }
    try {
      await apiClient.put(`/debates/${debateId}/comments/${comment._id}`, { content: editText });
      setLocalContent(editText);
      setIsEditing(false);
      toast.success('Argument updated.');
    } catch (err) {
      toast.error('Failed to update. Try again.');
    }
  }, [debateId, comment._id, editText, localContent]);

  const handlePostReply = useCallback(async () => {
    if (!replyText.trim()) return;
    setIsSubmittingReply(true);
    try {
      const newReply = await useDebateStore.getState().addComment(debateId, {
        content: replyText,
        parentComment: comment._id,
        optionId: comment.optionId,
      });
      setReplies(prev => [...prev, newReply]);
      setRepliesLoaded(true);
      setReplyText('');
      setIsReplying(false);
      setShowReplies(true);
      toast.success('Reply posted.');
    } catch (error) {
      toast.error('Failed to post reply.');
    } finally {
      setIsSubmittingReply(false);
    }
  }, [debateId, comment._id, comment.optionId, replyText]);

  const totalReplies = Math.max(comment.repliesCount || 0, replies.length);

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card-dark border border-border-subtle rounded-xl p-4 flex gap-4"
    >
      <div className="shrink-0">
        <Avatar src={comment.author?.profile?.avatar} username={comment.author?.username} size="md" />
      </div>

      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-2 relative">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to={`/profile/${comment.author?.username}`}
              className="font-bold text-white text-sm hover:text-primary transition-colors"
            >
              {comment.author?.username}
            </Link>
            <CredibilityBadge score={comment.author?.credibilityScore || 50} size="sm" />
            {option && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-bold border"
                style={{
                  color: option.color || '#00C8FF',
                  borderColor: `${option.color || '#00C8FF'}40`,
                  backgroundColor: `${option.color || '#00C8FF'}10`,
                }}
              >
                {option.label}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-text-muted">{formatTime(comment.createdAt)}</span>
            {comment.isEdited && <span className="text-[10px] text-text-muted italic">(edited)</span>}
            {isOwner && (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(m => !m)}
                  className="p-1 text-text-muted hover:text-white transition-colors rounded-full hover:bg-white/5"
                  aria-label="Argument options"
                >
                  <MoreHorizontal size={14} />
                </button>
                <AnimatePresence>
                  {showMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="absolute right-0 top-6 w-36 bg-bg-dark border border-border-subtle rounded-lg shadow-xl z-20 overflow-hidden"
                    >
                      <button
                        onClick={() => { setIsEditing(true); setShowMenu(false); }}
                        className="w-full text-left px-3 py-2.5 text-xs text-white hover:bg-white/5 flex items-center gap-2"
                      >
                        <Edit2 size={12} /> Edit
                      </button>
                      <button
                        onClick={() => { handleDeleteSelf(); setShowMenu(false); }}
                        className="w-full text-left px-3 py-2.5 text-xs text-error hover:bg-error/10 flex items-center gap-2"
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

        {/* Content */}
        {isEditing ? (
          <div className="mb-3">
            <textarea
              value={editText}
              onChange={e => setEditText(e.target.value)}
              className="w-full bg-bg-dark border border-border-subtle rounded-lg p-2 text-sm text-white focus:border-primary focus:outline-none min-h-[80px] resize-y"
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-2">
              <button onClick={() => { setIsEditing(false); setEditText(localContent); }} className="text-xs px-3 py-1.5 text-text-muted hover:text-white">
                Cancel
              </button>
              <button onClick={handleEdit} className="text-xs px-3 py-1.5 bg-primary text-bg-dark font-bold rounded hover:bg-primary/80">
                Save Changes
              </button>
            </div>
          </div>
        ) : localContent?.startsWith('>') ? (
          <div className="mb-3">
            <div className="pl-3 border-l-2 border-primary/50 text-text-muted text-xs italic mb-2 py-1.5 bg-white/5 rounded-r">
              {localContent.split('\n\n')[0].replace('> ', '')}
            </div>
            <p className="text-sm text-white/90 leading-relaxed">
              {localContent.split('\n\n').slice(1).join('\n\n')}
            </p>
          </div>
        ) : (
          <p className="text-sm text-text-muted leading-relaxed mb-3">{localContent}</p>
        )}

        {/* AI verification badge */}
        {comment.isAiVerified && (
          <div className="flex items-center gap-1.5 text-xs text-success mb-3 bg-success/10 border border-success/20 px-2.5 py-1 rounded-full inline-flex w-fit">
            <ShieldCheck size={11} />
            <span>AI-Verified · {comment.factCheckScore}% accuracy</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 text-xs font-medium text-text-muted mt-3">
          <button className="flex items-center gap-1.5 hover:text-white transition-colors">
            <ThumbsUp size={13} />
            <span>{comment.reactionsCount?.like || 0}</span>
          </button>

          <button
            onClick={() => setIsReplying(r => !r)}
            className="flex items-center gap-1.5 hover:text-white transition-colors"
          >
            <MessageCircle size={13} />
            <span>Reply</span>
          </button>

          <button
            onClick={() => {
              setReplyText(`> ${localContent}\n\n`);
              setIsReplying(true);
            }}
            className="flex items-center gap-1.5 hover:text-white transition-colors"
          >
            <Quote size={13} />
            <span>Quote</span>
          </button>

          {totalReplies > 0 && (
            <button
              onClick={() => setShowReplies(r => !r)}
              className="flex items-center gap-1 hover:text-white transition-colors ml-auto"
            >
              {showReplies ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              <span>{totalReplies} {totalReplies === 1 ? 'Reply' : 'Replies'}</span>
            </button>
          )}
        </div>

        {/* Reply form */}
        <AnimatePresence>
          {isReplying && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-border-subtle overflow-hidden"
            >
              <div className="flex flex-col gap-2">
                <textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Make your case logically…"
                  className="w-full bg-bg-dark border border-border-muted rounded-lg px-3 py-2 text-sm text-white focus:border-primary focus:outline-none min-h-[80px] resize-none"
                  autoFocus
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
                    disabled={isSubmittingReply || !replyText.trim()}
                    className="bg-primary text-bg-dark px-4 py-1.5 rounded text-xs font-bold hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmittingReply ? 'Posting…' : 'Post Reply'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Replies list */}
        <AnimatePresence>
          {showReplies && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 space-y-3 pl-4 border-l-2 border-border-subtle overflow-hidden"
            >
              {replies.length === 0 && repliesLoaded && (
                <p className="text-xs text-text-muted py-2">No replies yet.</p>
              )}
              {replies.map(reply => (
                <ReplyItem
                  key={reply._id}
                  reply={reply}
                  debateId={debateId}
                  currentUserId={currentUserId}
                  onDelete={handleDeleteReply}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
});

DebateComment.displayName = 'DebateComment';
