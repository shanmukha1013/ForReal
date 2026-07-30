import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useParams, useNavigate } from 'react-router-dom';
import useAuthStore from '@/store/useAuthStore';
import useDebateStore from '@/store/useDebateStore';
import apiClient from '@/services/api';
import { Loader } from '@/components';
import { StatusBadge, CredibilityBadge, Avatar } from '@/components/ui';
import { Trash2, Users, MessageSquare, ChevronLeft } from 'lucide-react';
import { VotePanel } from '@/features/debates/VotePanel';
import { AIAnalysisPanel } from '@/features/debates/AIAnalysisPanel';
import { DebateComment } from '@/features/debates/DebateComment';
import { DebateCommentForm } from '@/features/debates/DebateCommentForm';
import { toast } from 'react-hot-toast';
import { socketService } from '@/services/socket';

// Skeleton while loading the debate
const DebateSkeleton = () => (
  <div className="max-w-4xl mx-auto pb-20 animate-pulse">
    <div className="h-6 w-32 bg-border-subtle rounded-full mb-8" />
    <div className="h-12 bg-border-subtle rounded-xl mb-4 w-3/4" />
    <div className="h-4 bg-border-subtle rounded w-1/2 mb-8" />
    <div className="h-32 bg-border-subtle rounded-xl mb-8" />
    <div className="h-48 bg-border-subtle rounded-xl mb-8" />
  </div>
);

export const DebateView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { currentDebate, getDebate, addComment, isLoading, error } = useDebateStore();
  const [comments, setComments] = useState([]);
  const [typingUser, setTypingUser] = useState(null);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const hasJoinedRef = useRef(false);

  // Fetch debate + comments
  useEffect(() => {
    let cancelled = false;
    const fetchAll = async () => {
      try {
        await getDebate(id);
        if (cancelled) return;
        setCommentsLoading(true);
        const res = await useDebateStore.getState().fetchComments(id);
        if (!cancelled) {
          setComments(res.comments || []);
        }
      } catch (err) {
        // handled in store
      } finally {
        if (!cancelled) setCommentsLoading(false);
      }
    };
    fetchAll();
    return () => { cancelled = true; };
  }, [id, getDebate]);

  // Socket listeners — stable cleanup
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    if (!hasJoinedRef.current) {
      socket.emit('join_debate', id);
      hasJoinedRef.current = true;
    }

    const onNewComment = (comment) => {
      setComments(prev => {
        // Prevent duplicate if optimistically added
        if (prev.some(c => c._id === comment._id)) return prev;
        return [comment, ...prev];
      });
    };

    const onDebateUpdated = (updatedDebate) => {
      useDebateStore.setState({ currentDebate: updatedDebate });
    };

    const onTyping = (data) => {
      if (data.username !== useAuthStore.getState().user?.username) {
        setTypingUser(data.username);
      }
    };

    const onStopTyping = () => setTypingUser(null);

    socket.on('new_comment', onNewComment);
    socket.on('debate_updated', onDebateUpdated);
    socket.on('debate_typing', onTyping);
    socket.on('debate_stop_typing', onStopTyping);

    return () => {
      socket.off('new_comment', onNewComment);
      socket.off('debate_updated', onDebateUpdated);
      socket.off('debate_typing', onTyping);
      socket.off('debate_stop_typing', onStopTyping);
      socket.emit('leave_debate', id);
      hasJoinedRef.current = false;
    };
  }, [id]);

  const handlePostComment = useCallback(async (data) => {
    try {
      const newComment = await addComment(id, data);
      // Optimistically add if socket doesn't deliver it fast enough
      setComments(prev => {
        if (prev.some(c => c._id === newComment._id)) return prev;
        return [newComment, ...prev];
      });
      toast.success('Argument posted to the floor.');
    } catch (err) {
      toast.error('Failed to post argument. Try again.');
    }
  }, [id, addComment]);

  const handleDeleteComment = useCallback(async (commentId) => {
    if (!window.confirm('Permanently delete this argument?')) return;
    try {
      await apiClient.delete(`/debates/${id}/comments/${commentId}`);
      setComments(prev => prev.filter(c => c._id !== commentId));
      toast.success('Argument removed.');
    } catch (err) {
      toast.error('Could not delete argument. Try again.');
    }
  }, [id]);

  const handleDeleteDebate = useCallback(async () => {
    if (!window.confirm('Permanently delete this debate and all its arguments? This cannot be undone.')) return;
    try {
      await apiClient.delete(`/debates/${id}`);
      toast.success('Debate deleted.');
      navigate('/debates');
    } catch (err) {
      toast.error(err.message || 'Failed to delete debate.');
    }
  }, [id, navigate]);

  if (isLoading && !currentDebate) return <DebateSkeleton />;
  if (error) return (
    <div className="p-8 text-center">
      <p className="text-error font-bold mb-4">Could not load this debate.</p>
      <button onClick={() => navigate(-1)} className="text-primary underline text-sm">Go back</button>
    </div>
  );
  if (!currentDebate || currentDebate._id !== id) return <DebateSkeleton />;

  const isCreator = user?._id && currentDebate?.creator?._id &&
    user._id.toString() === currentDebate.creator._id.toString();

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {/* Back nav */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-text-muted hover:text-white transition-colors text-sm font-medium mb-6"
      >
        <ChevronLeft size={16} />
        Back to Debates
      </button>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <StatusBadge status={currentDebate.status} />
            <span className="text-sm font-bold text-text-muted uppercase tracking-widest">{currentDebate.category}</span>
          </div>
          {isCreator && (
            <button
              onClick={handleDeleteDebate}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-error bg-error/10 hover:bg-error/20 rounded-lg transition-colors border border-error/20"
            >
              <Trash2 size={14} />
              Delete Debate
            </button>
          )}
        </div>

        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight mb-6">
          {currentDebate.title}
        </h1>

        <div className="flex items-center gap-4 text-sm bg-surface p-4 rounded-xl border border-border-subtle">
          <Avatar src={currentDebate.creator?.profile?.avatar} username={currentDebate.creator?.username} size="md" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                to={`/profile/${currentDebate.creator?.username}`}
                className="font-bold text-white hover:text-primary transition-colors"
              >
                {currentDebate.creator?.username}
              </Link>
              <CredibilityBadge score={currentDebate.creator?.credibilityScore || 50} size="sm" />
            </div>
            <span className="text-text-muted text-xs">Started this debate</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-text-muted shrink-0">
            <span className="flex items-center gap-1">
              <Users size={13} />
              {currentDebate.stats?.participantCount || 0}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare size={13} />
              {currentDebate.stats?.totalComments || 0}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Context */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-card-dark rounded-xl border border-border-subtle p-6 mb-8"
      >
        <h3 className="text-white font-bold mb-3 text-sm uppercase tracking-wider">The Question</h3>
        <p className="text-text-muted leading-relaxed">{currentDebate.description}</p>
      </motion.div>

      {/* AI Analysis */}
      {currentDebate.aiAnalysis && (
        <AIAnalysisPanel analysis={currentDebate.aiAnalysis} />
      )}

      {/* Voting */}
      <VotePanel debate={currentDebate} />

      {/* Debate Floor */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            The Floor
            <span className="bg-border-subtle text-text-muted text-xs px-2.5 py-1 rounded-full font-semibold">
              {currentDebate.stats?.totalComments || 0}
            </span>
          </h3>
        </div>

        <DebateCommentForm
          debateId={currentDebate._id}
          debateOptions={currentDebate.options}
          onSubmit={handlePostComment}
        />

        {/* Typing indicator */}
        <AnimatePresence>
          {typingUser && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="text-xs text-text-muted italic mb-4 flex items-center gap-2 px-2"
            >
              <span className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </span>
              <span>{typingUser} is drafting an argument…</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Arguments list */}
        {commentsLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-card-dark border border-border-subtle rounded-xl p-4 animate-pulse h-24" />
            ))}
          </div>
        ) : comments.length > 0 ? (
          <div className="space-y-4">
            {comments.map(comment => (
              <DebateComment
                key={comment._id}
                comment={comment}
                debateOptions={currentDebate.options}
                debateId={id}
                onDelete={handleDeleteComment}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-text-muted border border-dashed border-border-subtle rounded-xl">
            <MessageSquare size={32} className="mx-auto mb-3 opacity-30" />
            <p className="font-bold text-white mb-1">The floor is open.</p>
            <p className="text-sm">Be the first to make your case.</p>
          </div>
        )}
      </div>
    </div>
  );
};
