import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { talkService } from '@/services/talkService';
import useAuthStore from '@/store/useAuthStore';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const CommentSection = React.memo(({ talk, isOpen, onToggle }) => {
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [localCommentsCount, setLocalCommentsCount] = useState(talk.commentsCount || 0);
  const { user } = useAuthStore();
  const inputRef = useRef(null);
  const hasFetchedRef = useRef(false);

  const fetchComments = useCallback(async () => {
    // Skip fetch if no real talk ID (optimistic talk)
    if (talk._id.startsWith('temp-')) return;
    
    try {
      setIsLoading(true);
      const data = await talkService.getComments(talk._id);
      if (data.success) {
        setComments(data.data);
        setLocalCommentsCount(data.data.length);
      }
    } catch (error) {
      console.error('Failed to fetch comments', error);
    } finally {
      setIsLoading(false);
    }
  }, [talk._id]);

  // Fetch comments when section opens, only once per talk
  useEffect(() => {
    if (isOpen && !hasFetchedRef.current) {
      fetchComments();
      hasFetchedRef.current = true;
    }
  }, [isOpen, fetchComments]);

  // Focus input when comments open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    const tempContent = newComment;
    
    // Optimistic comment
    const optimisticComment = {
      _id: `temp-comment-${Date.now()}`,
      author: user,
      content: tempContent,
      createdAt: new Date().toISOString(),
      isOptimistic: true,
    };
    
    setComments(prev => [...prev, optimisticComment]);
    setLocalCommentsCount(prev => prev + 1);
    setNewComment('');
    setIsSubmitting(true);

    try {
      const res = await talkService.addComment(talk._id, tempContent);
      if (res.success) {
        // Replace optimistic comment with real one
        setComments(prev => prev.map(c => 
          c._id === optimisticComment._id ? res.data : c
        ));
      }
    } catch (error) {
      console.error('Failed to post comment', error);
      // Rollback
      setComments(prev => prev.filter(c => c._id !== optimisticComment._id));
      setLocalCommentsCount(prev => prev - 1);
      setNewComment(tempContent);
      toast.error('Could not post comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const formatRelativeTime = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return 'now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  return (
    <div>
      {/* Show comment count link when closed and there are comments */}
      {!isOpen && localCommentsCount > 0 && (
        <button 
          onClick={onToggle}
          className="text-text-muted text-xs font-medium hover:text-primary transition-colors py-1 mt-1"
        >
          View {localCommentsCount} comment{localCommentsCount !== 1 ? 's' : ''}
        </button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-3 space-y-3">
              {/* Loading state */}
              {isLoading && (
                <div className="flex justify-center py-3">
                  <Loader2 size={18} className="animate-spin text-text-muted" />
                </div>
              )}
              
              {/* Comments list */}
              {!isLoading && comments.map((comment) => (
                <div 
                  key={comment._id} 
                  className={`flex gap-2.5 ${comment.isOptimistic ? 'opacity-60' : ''}`}
                >
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary flex-shrink-0 text-xs mt-0.5">
                    {comment.author?.username?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="bg-bg-dark rounded-xl rounded-tl-none px-3 py-2 border border-border-subtle">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="font-semibold text-white text-xs">
                          @{comment.author?.username}
                        </span>
                        <span className="text-xs text-text-muted shrink-0">
                          {formatRelativeTime(comment.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-text-main break-words whitespace-pre-wrap leading-relaxed">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Empty state */}
              {!isLoading && comments.length === 0 && (
                <p className="text-xs text-text-muted text-center py-2">
                  No comments yet. Say something.
                </p>
              )}
            </div>

            {/* Comment input */}
            <div className="flex gap-2.5 items-start mt-3 pt-3 border-t border-border-subtle/50">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary flex-shrink-0 text-xs mt-1">
                {user?.username?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Say it straight."
                  className="w-full bg-bg-dark text-white text-sm rounded-xl border border-border-subtle py-2.5 px-3 pr-14 focus:outline-none focus:border-primary resize-none min-h-[40px] max-h-[120px] transition-colors"
                  rows={1}
                  disabled={isSubmitting}
                  onInput={(e) => {
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                  }}
                />
                <button 
                  onClick={handleSubmit}
                  disabled={!newComment.trim() || isSubmitting}
                  className="absolute right-3 bottom-2.5 text-primary font-semibold text-xs disabled:opacity-40 disabled:cursor-not-allowed hover:text-primary/80 transition-colors"
                >
                  {isSubmitting ? <Loader2 size={12} className="animate-spin" /> : 'Post'}
                </button>
              </div>
            </div>

            {/* Collapse button */}
            <button 
              onClick={onToggle}
              className="text-text-muted text-xs font-medium hover:text-white transition-colors py-2 w-full text-center mt-1"
            >
              Hide comments
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

CommentSection.displayName = 'CommentSection';
