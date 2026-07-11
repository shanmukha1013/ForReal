import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { talkService } from '@/services/talkService';
import useAuthStore from '@/store/useAuthStore';


export const CommentSection = React.memo(({ talk }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const { user } = useAuthStore();

  const fetchComments = async () => {
    try {
      setIsLoading(true);
      const data = await talkService.getComments(talk._id);
      if (data.success) {
        setComments(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch comments', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = () => {
    if (!isExpanded && comments.length === 0 && talk.commentsCount > 0) {
      fetchComments();
    }
    setIsExpanded(!isExpanded);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const res = await talkService.addComment(talk._id, newComment);
      if (res.success) {
        setComments([...comments, res.data]);
        setNewComment('');
        talk.commentsCount += 1; // Optimistic local update
      }
    } catch (error) {
      console.error('Failed to post comment', error);
    }
  };

  return (
    <div className="mt-2">
      {talk.commentsCount > 0 && !isExpanded && (
        <button 
          onClick={handleToggle}
          className="text-primary text-sm font-medium hover:underline py-1"
        >
          View all {talk.commentsCount} comments
        </button>
      )}

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="py-3 space-y-4">
              {isLoading ? (
                <div className="text-center text-text-muted text-sm py-2">Loading comments...</div>
              ) : (
                comments.map((comment) => (
                  <div key={comment._id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-card-dark border border-border-subtle flex items-center justify-center font-bold text-primary flex-shrink-0 text-sm">
                      {comment.author.username?.[0]?.toUpperCase()}
                    </div>
                    <div className="bg-bg-dark rounded-xl rounded-tl-none p-3 border border-border-subtle flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-white text-sm">{comment.author.username}</span>
                        <span className="text-xs text-text-muted">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-text-main break-words whitespace-pre-wrap">{comment.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <button 
              onClick={handleToggle}
              className="text-text-muted text-sm font-medium hover:text-white py-2 w-full text-center mb-2 transition-colors"
            >
              Hide comments
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-3 flex gap-3 items-start">
        <div className="w-8 h-8 rounded-full bg-card-dark border border-border-subtle flex items-center justify-center font-bold text-primary flex-shrink-0 text-sm mt-1">
          {user?.username?.[0]?.toUpperCase()}
        </div>
        <form onSubmit={handleSubmit} className="flex-1 relative">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Add a comment..."
            className="w-full bg-bg-dark text-white text-sm rounded-xl border border-border-subtle py-2.5 px-4 focus:outline-none focus:border-primary resize-none min-h-[44px] transition-property-common"
            rows={1}
            style={{ 
              height: 'auto',
              minHeight: '44px',
              maxHeight: '120px'
            }}
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
          />
          <button 
            type="submit"
            disabled={!newComment.trim()}
            className="absolute right-3 bottom-2.5 text-primary font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:text-primary-dark"
          >
            Post
          </button>
        </form>
      </div>
    </div>
  );
});

CommentSection.displayName = 'CommentSection';
