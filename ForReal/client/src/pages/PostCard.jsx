import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  useContext,
} from 'react';
import PropTypes from 'prop-types';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HeartIcon,
  ChatBubbleLeftIcon,
  TrashIcon,
  PhotoIcon,
  ShareIcon,
  BookmarkIcon,
  HandThumbDownIcon,
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon, BookmarkIcon as BookmarkSolidIcon, HandThumbDownIcon as HandThumbDownSolidIcon } from '@heroicons/react/24/solid';
import { useSocket } from '../realtime/socket';
import { AuthContext } from '../context/AuthContext';
import { useNotification } from '../components/Notification';
import { useInView } from 'framer-motion'; // for viewport detection if needed
import { storageCache } from '../lib/storageCache';

// -----------------------------------------------------------------------------
// Helper Utils
// -----------------------------------------------------------------------------

export const timeAgo = (date) => {
  if (!date) {return 'unknown';}
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 10) {return 'just now';}
  if (seconds < 60) {return `${seconds}s ago`;}
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {return `${minutes}m ago`;}
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {return `${hours}h ago`;}
  const days = Math.floor(hours / 24);
  if (days < 7) {return `${days}d ago`;}
  return new Date(date).toLocaleDateString();
};

export const formatCount = (num) => {
  if (!num && num !== 0) {return '0';}
  if (num >= 1000000) {return (num / 1000000).toFixed(1) + 'M';}
  if (num >= 1000) {return (num / 1000).toFixed(1) + 'k';}
  return num.toString();
};

// -----------------------------------------------------------------------------
// Animation Variants
// -----------------------------------------------------------------------------

const cardVariants = {
  initial: { opacity: 0, y: 16, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
};

const hoverGlow = {
  rest: { boxShadow: '0px 4px 20px -8px rgba(0, 255, 136, 0)' },
  hover: { boxShadow: '0px 8px 30px -6px rgba(0, 255, 136, 0.15)' },
};

const commentVariants = {
  hidden: { opacity: 0, height: 0, y: -10 },
  visible: {
    opacity: 1,
    height: 'auto',
    y: 0,
    transition: { duration: 0.2 },
  },
  exit: {
    opacity: 0,
    height: 0,
    y: -10,
    transition: { duration: 0.15 },
  },
};

const skeletonPulse = {
  animate: { opacity: [0.4, 0.8, 0.4], transition: { repeat: Infinity, duration: 1.5 } },
};

// -----------------------------------------------------------------------------
// Custom Hooks
// -----------------------------------------------------------------------------

/**
 * Optimistic like handler – instantly updates local state and reverts on error.
 */
const useReactionOptimistic = (initialReaction, initialLikes, initialDislikes, onReactCallback) => {
  const [reaction, setReaction] = useState(initialReaction); // 'like', 'dislike', or null
  const [counts, setCounts] = useState({ likes: initialLikes, dislikes: initialDislikes });

  // Sync with external changes (e.g. socket updates)
  useEffect(() => {
    setReaction(initialReaction);
    setCounts({ likes: initialLikes, dislikes: initialDislikes });
  }, [initialReaction, initialLikes, initialDislikes]);

  const setReactionType = useCallback(async (newReactionType) => { // e.g., 'like' or 'dislike'
    const oldReaction = reaction;
    const oldCounts = { ...counts };

    // Determine new reaction state
    const finalReaction = oldReaction === newReactionType ? null : newReactionType;

    // Optimistically update counts
    const newCounts = { ...counts };
    if (oldReaction === newReactionType) { // Toggling off
      newCounts[newReactionType + 's']--;
    } else if (oldReaction && oldReaction !== newReactionType) { // Switching reaction
      newCounts[oldReaction + 's']--;
      newCounts[newReactionType + 's']++;
    } else { // New reaction
      newCounts[newReactionType + 's']++;
    }

    setReaction(finalReaction);
    setCounts(newCounts);

    try {
      if (onReactCallback) {
        await onReactCallback(finalReaction); // Pass the final state
      }
    } catch (error) {
      // Revert on failure
      setReaction(oldReaction);
      setCounts(oldCounts);
    }
  }, [reaction, counts, onReactCallback]);

  return { reaction, counts, setReactionType };
};

/**
 * Hook to handle comment expansion with lazy loading (simulated).
 */
const useCommentsExpander = (initialComments, totalComments, fetchMore) => {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState(initialComments);

  useEffect(() => {
    setComments(initialComments);
  }, [initialComments]);

  const handleViewAll = useCallback(async () => {
    if (expanded) {
      setExpanded(false);
      setComments(initialComments); // collapse back to preview
      return;
    }
    setExpanded(true);
    if (totalComments > initialComments.length && fetchMore) {
      setLoading(true);
      try {
        const more = await fetchMore();
        setComments((prev) => [...prev, ...more]);
      } catch (e) {
        // keep existing
      } finally {
        setLoading(false);
      }
    }
  }, [expanded, initialComments, totalComments, fetchMore]);

  return { comments, expanded, loading, handleViewAll };
};

/**
 * Simulates realtime updates via socket.
 * In production, replace with actual socket.on listeners.
 */
const useRealtimePostUpdates = (postId, setPost) => {
  const socket = useSocket(); // hypothetical socket context
  useEffect(() => {
    if (!socket || !postId) {return;}

    const handleLikeUpdate = (data) => {
      if (data.postId === postId) {
        setPost((prev) => ({
          ...prev,
          likes: data.likes,
        }));
      }
    };

    const handleNewComment = (data) => {
      if (data.postId === postId) {
        setPost((prev) => ({
          ...prev,
          comments: [...(prev.comments || []), data.comment],
        }));
      }
    };

    socket.on('post:likeUpdate', handleLikeUpdate);
    socket.on('post:newComment', handleNewComment);

    return () => {
      socket.off('post:likeUpdate', handleLikeUpdate);
      socket.off('post:newComment', handleNewComment);
    };
  }, [socket, postId, setPost]);
};

// -----------------------------------------------------------------------------
// Subcomponents
// -----------------------------------------------------------------------------

const SkeletonCard = () => (
  <motion.div
    variants={cardVariants}
    initial="initial"
    animate="animate"
    className="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 p-4 sm:p-5"
  >
    <div className="flex items-center gap-3 mb-4">
      <motion.div variants={skeletonPulse} animate="animate" className="w-11 h-11 rounded-full bg-white/5" />
      <div className="space-y-2 flex-1">
        <motion.div variants={skeletonPulse} animate="animate" className="h-4 w-28 bg-white/5 rounded" />
        <motion.div variants={skeletonPulse} animate="animate" className="h-3 w-20 bg-white/5 rounded" />
      </div>
    </div>
    <motion.div variants={skeletonPulse} animate="animate" className="h-4 w-full bg-white/5 rounded mb-3" />
    <motion.div variants={skeletonPulse} animate="animate" className="h-4 w-2/3 bg-white/5 rounded mb-4" />
    <motion.div variants={skeletonPulse} animate="animate" className="h-48 w-full bg-white/5 rounded-xl mb-4" />
    <div className="flex gap-3">
      <motion.div variants={skeletonPulse} animate="animate" className="h-10 flex-1 bg-white/5 rounded-full" />
      <motion.div variants={skeletonPulse} animate="animate" className="h-10 flex-1 bg-white/5 rounded-full" />
    </div>
  </motion.div>
);

const TalkHeader = ({ author, createdAt, onDelete, showDelete }) => {
  const displayName = author?.displayName || author?.username || 'Anonymous';
  const username = author?.username || 'user';
  const avatarSrc =
    author?.avatar ||
    `https://ui-avatars.com/api/?name=${displayName}&background=0F0F0F&color=00FF88&bold=true`;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3 min-w-0">
        <motion.img
          whileHover={{ scale: 1.05 }}
          transition={{ type: 'spring', stiffness: 400 }}
          src={avatarSrc}
          alt={displayName}
          className="h-11 w-11 rounded-full border border-neon/30 bg-black/40 object-cover shadow-glow-sm"
          loading="lazy"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white truncate">{displayName}</span>
            <span className="hidden sm:inline-block text-[10px] font-mono font-bold tracking-wider text-neon border border-neon/30 px-1.5 py-0.5 rounded-full bg-neon/5">
              TALK
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <span>@{username}</span>
            <span className="text-gray-600">•</span>
            <span>{timeAgo(createdAt)}</span>
          </div>
        </div>
      </div>
      {showDelete && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            if (window.confirm('Delete this talk permanently?')) {onDelete();}
          }}
          className="p-2 rounded-full text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          aria-label="Delete talk"
        >
          <TrashIcon className="h-4 w-4" />
        </motion.button>
      )}
    </div>
  );
};

const TalkContent = ({ content }) => {
  const [truncated, setTruncated] = useState(true);
  const MAX_LENGTH = 280;
  const needsTruncation = content.length > MAX_LENGTH;
  const displayContent = truncated && needsTruncation ? content.slice(0, MAX_LENGTH) + '...' : content;

  return (
    <div className="mt-3 text-gray-200 text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words">
      {displayContent}
      {needsTruncation && (
        <button
          onClick={() => setTruncated(!truncated)}
          className="ml-1 text-neon text-xs font-medium hover:underline"
        >
          {truncated ? 'Read more' : 'Show less'}
        </button>
      )}
    </div>
  );
};

const MediaGallery = ({ media = [] }) => {
  const [loaded, setLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  if (!media.length) {return null;}

  return (
    <div className="relative mt-3 rounded-xl overflow-hidden bg-black/40 border border-white/5">
      {!loaded && !imgError && (
        <motion.div
          variants={skeletonPulse}
          animate="animate"
          className="w-full h-48 bg-white/5"
        />
      )}
      <motion.img
        initial={{ opacity: 0 }}
        animate={{ opacity: loaded ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        src={media[0]}
        alt="Talk media"
        className={`w-full max-h-[480px] object-cover ${loaded ? '' : 'absolute inset-0 opacity-0'}`}
        onLoad={() => setLoaded(true)}
        onError={() => setImgError(true)}
        loading="lazy"
      />
      {media.length > 1 && (
        <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-md text-neon text-xs font-mono px-2 py-1 rounded-full border border-neon/30">
          +{media.length - 1} more
        </div>
      )}
    </div>
  );
};

const EngagementStats = ({ likesCount, dislikesCount, commentsCount }) => {
  if (!likesCount && !commentsCount && !dislikesCount) {return null;}
  return (
    <div className="flex items-center gap-6 text-xs text-gray-400 border-t border-white/5 pt-3 mt-1">
      {likesCount > 0 && (
        <div className="flex items-center gap-1.5">
          <HeartIcon className="h-3.5 w-3.5 text-neon" />
          <span className="font-medium text-white">{formatCount(likesCount)}</span>
          <span className="hidden sm:inline">likes</span>
        </div>
      )}
      {dislikesCount > 0 && (
        <div className="flex items-center gap-1.5">
          <HandThumbDownIcon className="h-3.5 w-3.5 text-red-400" />
          <span className="font-medium text-white">{formatCount(dislikesCount)}</span>
          <span className="hidden sm:inline">dislikes</span>
        </div>
      )}
      {commentsCount > 0 && (
        <div className="flex items-center gap-1.5">
          <ChatBubbleLeftIcon className="h-3.5 w-3.5 text-neon" />
          <span className="font-medium text-white">{formatCount(commentsCount)}</span>
          <span className="hidden sm:inline">responses</span>
        </div>
      )}
    </div>
  );
};

const TalkActions = ({ reaction, onReact, counts, isLoading, saved, onSave, onShare }) => {
  const liked = reaction === 'like';
  const disliked = reaction === 'dislike';

  return (
    <div className="flex items-center gap-3 mt-4 pt-1">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => onReact('like')}
        disabled={isLoading}
        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full font-medium text-sm transition-all duration-200 ${
          liked
            ? 'bg-neon/10 border border-neon text-neon shadow-glow-sm'
            : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:border-neon/30'
        } ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
        aria-label={liked ? 'Unlike' : 'Like'}
      >
        {liked ? (
          <HeartSolidIcon className="h-4 w-4 text-neon" />
        ) : (
          <HeartIcon className="h-4 w-4" />
        )}
        <span>{liked ? 'Liked' : 'Support'} {counts.likes > 0 && formatCount(counts.likes)}</span>
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => onReact('dislike')}
        disabled={isLoading}
        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full font-medium text-sm transition-all duration-200 ${
          disliked
            ? 'bg-red-500/10 border border-red-400 text-red-400'
            : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:border-red-400/30'
        } ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
        aria-label={disliked ? 'Remove dislike' : 'Dislike'}
      >
        {disliked ? (
          <HandThumbDownSolidIcon className="h-4 w-4 text-red-400" />
        ) : (
          <HandThumbDownIcon className="h-4 w-4" />
        )}
        <span>{disliked ? 'Disliked' : 'Dislike'} {counts.dislikes > 0 && formatCount(counts.dislikes)}</span>
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => onReact('comment')}
        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:border-neon/30 font-medium text-sm transition-all"
        aria-label="Comment"
      >
        <ChatBubbleLeftIcon className="h-4 w-4" />
        <span>Respond</span>
      </motion.button>
      
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onSave}
        className="p-2.5 rounded-full bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:border-neon/30 transition-all"
        title="Bookmark"
      >
        {saved ? <BookmarkSolidIcon className="w-4 h-4 text-neon" /> : <BookmarkIcon className="w-4 h-4" />}
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onShare}
        className="p-2.5 rounded-full bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:border-neon/30 transition-all"
        title="Share"
      >
        <ShareIcon className="w-4 h-4" />
      </motion.button>
    </div>
  );
};

const CommentsPreview = ({ comments, onViewAll, timeAgoFn, showInput, commentText, setCommentText, onSubmitComment }) => {
  const { comments: displayComments, expanded, loading, handleViewAll } =
    useCommentsExpander(comments, comments.length, null); // null means no fetch more

  if (!comments?.length && !showInput) {return null;}

  const previewCount = 2;
  const visibleComments = expanded ? displayComments : displayComments.slice(0, previewCount);
  const hasMore = comments.length > previewCount && !expanded;

  return (
    <div className="mt-4 pt-3 border-t border-white/5">
      <AnimatePresence initial={false}>
        {visibleComments.map((comment, idx) => (
          <motion.div
            key={comment._id || idx}
            variants={commentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            layout
            className="py-2 text-sm border-b border-white/5 last:border-0"
          >
            <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-black to-gray-800 border border-white/10 flex-shrink-0 mt-0.5 overflow-hidden">
                  {comment.author?.avatar && <img src={comment.author.avatar} alt="avatar" className="w-full h-full object-cover" />}
                </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-neon text-xs">
                    @{comment.author?.username || 'anonymous'}
                  </span>
                  <span className="text-gray-500 text-[10px]">
                    {timeAgoFn(comment.createdAt)}
                  </span>
                </div>
                <p className="text-gray-300 text-sm mt-0.5 break-words">{comment.content}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {hasMore && (
        <button
          onClick={handleViewAll}
          className="mt-2 text-neon text-xs font-medium hover:underline transition-all flex items-center gap-1"
          disabled={loading}
        >
          {loading ? 'Loading...' : `View all ${comments.length} responses →`}
        </button>
      )}

      <AnimatePresence>
        {showInput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 flex items-start gap-2"
          >
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a response..."
              className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-neon/50 transition-colors"
              onKeyPress={(e) => e.key === 'Enter' && onSubmitComment()}
              autoFocus
            />
            <button
              onClick={onSubmitComment}
              disabled={!commentText.trim()}
              className="px-3 py-2 rounded-xl bg-neon text-black text-sm font-bold disabled:opacity-50 transition-opacity"
            >
              Post
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// -----------------------------------------------------------------------------
// Main PostCard Component
// -----------------------------------------------------------------------------

const PostCard = ({
  post,
  onLike,
  onComment,
  onDelete,
  currentUserId,
  isLoading,   // external loading flag for skeleton
}) => {
  const { user: authUser } = useContext(AuthContext) || {};
  const notify = useNotification();

  // If loading, display skeleton
  if (isLoading || !post) {
    return <SkeletonCard />;
  }

  // Normalize post data
  const safePost = {
    _id: post?._id,
    content: post?.content || '',
    author: (String(post?.author?._id || post?.author?.id || post?.author?.username) === String(myId)) 
             ? { ...post?.author, ...authUser } 
             : post?.author || {},
    likes: post?.likes || [],
    dislikes: post?.dislikes || [],
    comments: post?.comments || [],
    media: post?.media || [],
    createdAt: post?.createdAt || new Date().toISOString(),
  };

  const myId = currentUserId || authUser?._id || authUser?.id;

  const initialReaction = useMemo(() => {
    if (safePost.likes.some((l) => String(l) === String(myId))) {return 'like';}
    if (safePost.dislikes.some((d) => String(d) === String(myId))) {return 'dislike';}
    return null;
  }, [safePost.likes, safePost.dislikes, myId]);

  const initialLikeCount = safePost.likes.length;
  const initialDislikeCount = safePost.dislikes.length;

  // Custom hooks
  const { reaction, counts, setReactionType } = useReactionOptimistic(
    initialReaction,
    initialLikeCount,
    initialDislikeCount,
    () => {
      if (onLike && safePost._id) {onLike(safePost._id);}
    }
  );

  const [localComments, setLocalComments] = useState(safePost.comments);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentText, setCommentText] = useState('');
  
  const [saved, setSaved] = useState(() => {
    try {
      return storageCache.isSaved(safePost._id);
    } catch(e) { return false; }
  });

  const handleReaction = (reactionType) => {
    if (reactionType === 'comment') {
      handleCommentToggle();
      return;
    }

    setReactionType(reactionType); // Update UI optimistically

    const localTalks = storageCache.getPosts();
    const idx = localTalks.findIndex(p => p._id === safePost._id);
    const updatedPost = idx !== -1 ? localTalks[idx] : { ...safePost };
    
    updatedPost.likes = updatedPost.likes || [];
    updatedPost.dislikes = updatedPost.dislikes || [];

    const newReaction = reaction === reactionType ? null : reactionType;

    // Remove from all lists first
    updatedPost.likes = updatedPost.likes.filter(uid => String(uid) !== String(myId));
    updatedPost.dislikes = updatedPost.dislikes.filter(uid => String(uid) !== String(myId));

    if (newReaction === 'like') {
      updatedPost.likes.push(myId);
      if (String(safePost.author?._id || safePost.author?.id) !== String(myId)) {
        storageCache.addNotification({ _id: `notif_like_${Date.now()}`, type: 'like', actor: authUser || { username: 'User' }, text: 'liked your talk', targetId: safePost._id, targetText: safePost.content?.substring(0, 20), read: false, createdAt: new Date().toISOString() });
        window.dispatchEvent(new Event('local_notify'));
      }
    } else if (newReaction === 'dislike') {
      updatedPost.dislikes.push(myId);
      if (String(safePost.author?._id || safePost.author?.id) !== String(myId)) {
        storageCache.addNotification({ _id: `notif_dislike_${Date.now()}`, type: 'dislike', actor: authUser || { username: 'User' }, text: 'disliked your talk', targetId: safePost._id, targetText: safePost.content?.substring(0, 20), read: false, createdAt: new Date().toISOString() });
        window.dispatchEvent(new Event('local_notify'));
      }
    }
    
    if (idx !== -1) {
      storageCache.updatePost(safePost._id, updatedPost);
    } else {
      storageCache.addPost(updatedPost);
    }
  };

  const handleCommentToggle = () => {
    setShowCommentInput(!showCommentInput);
  };

  const submitComment = () => {
    if (!commentText.trim()) {return;}
    const newComment = {
      _id: `comment_${Date.now()}`,
      content: commentText.trim(),
      author: authUser || { username: 'Guest' },
      createdAt: new Date().toISOString()
    };
    setLocalComments(prev => [...prev, newComment]);

    const localTalks = storageCache.getPosts();
    const idx = localTalks.findIndex(p => p._id === safePost._id);
    if (idx !== -1) {
      const updatedPost = { ...localTalks[idx] };
      updatedPost.comments = [...(updatedPost.comments || []), newComment];
      storageCache.updatePost(safePost._id, updatedPost);
    }

    setCommentText('');
    setShowCommentInput(false);
    if (onComment) {onComment(safePost._id);}
  };

  const handleSave = () => {
    const newSaved = !saved;
    setSaved(newSaved);
    if (newSaved) {
      storageCache.addSaved(safePost._id);
    } else {
      storageCache.removeSaved(safePost._id);
    }
    if (newSaved) {notify.success('Saved to bookmarks');}
  };

  const handleShare = () => {
    navigator.clipboard.writeText(`${window.location.origin}/post/${safePost._id}`);
    notify.success('Link copied to clipboard!');
  };

  const handleDelete = useCallback(() => {
    if (onDelete && safePost._id) {onDelete(safePost._id);}
  }, [onDelete, safePost._id]);

  const showDelete = !!onDelete && !!myId && String(safePost.author?._id) === String(myId);

  return (
    <motion.article
      variants={cardVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      whileHover="hover"
      layout
      className="group relative bg-gradient-to-br from-black/80 via-black/60 to-black/80 backdrop-blur-xl rounded-2xl border border-white/10 hover:border-neon/40 shadow-xl transition-all duration-300"
    >
      {/* Glow overlay */}
      <motion.div
        className="absolute inset-0 rounded-2xl bg-gradient-to-r from-neon/0 via-neon/5 to-neon/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        variants={hoverGlow}
        initial="rest"
        whileHover="hover"
        transition={{ type: 'tween', duration: 0.4 }}
      />

      <div className="relative p-4 sm:p-5">
        <TalkHeader
          author={safePost.author}
          createdAt={safePost.createdAt}
          onDelete={handleDelete}
          showDelete={showDelete}
        />

        <TalkContent content={safePost.content} />

        <MediaGallery media={safePost.media} />

        <EngagementStats
          likesCount={counts.likes}
          dislikesCount={counts.dislikes}
          commentsCount={localComments.length}
        />

        <TalkActions
          reaction={reaction}
          onReact={handleReaction}
          counts={counts}
          isLoading={false}
          saved={saved}
          onSave={handleSave}
          onShare={handleShare}
        />

        <CommentsPreview
          comments={localComments}
          timeAgoFn={timeAgo}
          showInput={showCommentInput}
          commentText={commentText}
          setCommentText={setCommentText}
          onSubmitComment={submitComment}
        />
      </div>
    </motion.article>
  );
};

PostCard.propTypes = {
  post: PropTypes.shape({
    _id: PropTypes.string,
    content: PropTypes.string,
    author: PropTypes.object,
    likes: PropTypes.array,
    comments: PropTypes.array,
    media: PropTypes.array,
    createdAt: PropTypes.string,
  }).isRequired,
  onLike: PropTypes.func,
  onComment: PropTypes.func,
  onDelete: PropTypes.func,
  currentUserId: PropTypes.string,
  isLoading: PropTypes.bool,
};

PostCard.defaultProps = {
  isLoading: false,
};

export default React.memo(PostCard);