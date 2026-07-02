import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  useContext,
} from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HeartIcon,
  ChatBubbleLeftIcon,
  TrashIcon,
  ShareIcon,
  BookmarkIcon,
  ShieldCheckIcon,
  CheckBadgeIcon,
  ExclamationTriangleIcon,
  LinkIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';
import { useSocket } from '../realtime/socket';
import { AuthContext } from '../context/AuthContext';
import { useNotification } from '../components/Notification';
// for viewport detection if needed
import { useCredibility, updateCredibility, getVoteWeight } from '../hooks/useCredibility';
import { storageCache } from '../lib/storageCache';
import api from '../api/api';

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

const REACTION_TYPES = [
  { id: 'like', icon: '❤️', label: 'Like' },
  { id: 'dislike', icon: '👎', label: 'Dislike' },
  { id: 'agree', icon: '🤝', label: 'Agree' },
  { id: 'disagree', icon: '🙅', label: 'Disagree' },
  { id: 'facts', icon: '💯', label: 'Facts' },
  { id: 'cap', icon: '🧢', label: 'Cap' },
  { id: 'misleading', icon: '⚠️', label: 'Misleading' },
  { id: 'validPoint', icon: '🎯', label: 'Valid Point' },
];

const arrayKeyMap = {
  like: 'likes',
  dislike: 'dislikes',
  agree: 'agrees',
  disagree: 'disagrees',
  facts: 'facts',
  cap: 'caps',
  misleading: 'misleadings',
  validPoint: 'validPoints'
};

const getProfilePath = (user) => {
  const target = user?.username || user?._id || user?.id;
  return target ? `/profile/${encodeURIComponent(target)}` : null;
};

const mergeById = (items) => Array.from(
  new Map((items || []).filter(Boolean).map((item, index) => [item._id || item.id || `idx_${index}_${item.createdAt || ''}`, item])).values()
);

const normalizeComment = (comment) => ({
  ...comment,
  content: comment?.content || comment?.text || '',
});

/**
 * Optimistic like handler – instantly updates local state and reverts on error.
 */
const useReactionOptimistic = (initialReaction, initialCounts, onReactCallback) => {
  const [reaction, setReaction] = useState(initialReaction);
  const [counts, setCounts] = useState(initialCounts);

  // Sync with external changes (e.g. socket updates)
  useEffect(() => {
    setReaction(initialReaction);
    setCounts(initialCounts);
  }, [initialReaction, JSON.stringify(initialCounts)]);

  const setReactionType = useCallback(async (newReactionType) => {
    setReaction(prev => {
      const finalReaction = prev === newReactionType ? null : newReactionType;
      
      setCounts(oldCounts => {
        const newCounts = { ...oldCounts };
        if (prev) {newCounts[prev] = Math.max(0, newCounts[prev] - 1);}
        if (finalReaction) {newCounts[finalReaction] = (newCounts[finalReaction] || 0) + 1;}
        return newCounts;
      });

      try {
        if (onReactCallback) {onReactCallback(finalReaction);}
      } catch (e) { console.warn('useReactionOptimistic onReactCallback failed', e); }

      return finalReaction;
    });
  }, [onReactCallback]);

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
        console.warn('useCommentsExpander fetchMore failed', e);
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

/**
 * Hook to manage fact-checking logic and persistence.
 */
const useFactCheck = (postId, initialVerifications, initialDisputes, myId, myCredScore) => {
  const [verifications, setVerifications] = useState(initialVerifications || []);
  const [disputes, setDisputes] = useState(initialDisputes || []);

  // Keep local state in sync if parent data changes
  useEffect(() => {
    setVerifications(initialVerifications || []);
    setDisputes(initialDisputes || []);
  }, [initialVerifications, initialDisputes]);

  const handleFactCheck = useCallback((action) => {
    if (!myId) {return;}
    
    const weight = getVoteWeight(myCredScore);
    const newVote = { userId: myId, weight };

    const newV = verifications.filter(v => v.userId !== myId);
    const newD = disputes.filter(d => d.userId !== myId);

    if (action === 'verify' && !verifications.some(v => v.userId === myId)) {
      newV.push(newVote);
    } else if (action === 'dispute' && !disputes.some(d => d.userId === myId)) {
      newD.push(newVote);
    }

    setVerifications(newV);
    setDisputes(newD);

    // Persist to local storage
    storageCache.updatePost(postId, { verifications: newV, disputes: newD });
    
    api.posts.interact(postId, action).catch(e => console.warn('Fact check sync failed', e));
  }, [postId, verifications, disputes, myId, myCredScore]);

  return { verifications, disputes, handleFactCheck };
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

const TalkHeader = ({ author, createdAt, onDelete, showDelete, isAnonymous }) => {
  const displayName = isAnonymous ? 'Anonymous Voice' : (author?.displayName || author?.username || 'Anonymous');
  const username = isAnonymous ? 'anonymous' : (author?.username || 'user');
  const avatarSrc = isAnonymous
    ? `https://ui-avatars.com/api/?name=A&background=0F0F0F&color=a855f7&bold=true`
    : (author?.avatar || `https://ui-avatars.com/api/?name=${displayName}&background=0F0F0F&color=00FF88&bold=true`);
  const { score, rank } = useCredibility(author?._id || author?.username);
  const profilePath = !isAnonymous ? getProfilePath(author) : null;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3 min-w-0">
        {profilePath ? (
          <Link to={profilePath} className="flex-shrink-0" aria-label={`Open ${displayName}'s profile`}>
            <motion.img
              whileHover={{ scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 400 }}
              src={avatarSrc}
              alt={displayName}
              className="h-11 w-11 rounded-full border border-neon/30 bg-black/40 object-cover shadow-glow-sm"
              loading="lazy"
            />
          </Link>
        ) : (
          <motion.img
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 400 }}
            src={avatarSrc}
            alt={displayName}
            className="h-11 w-11 rounded-full border border-neon/30 bg-black/40 object-cover shadow-glow-sm"
            loading="lazy"
          />
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {profilePath ? (
              <Link to={profilePath} className="text-sm font-bold text-white truncate hover:text-neon transition-colors">
                {displayName}
              </Link>
            ) : (
              <span className="text-sm font-bold text-white truncate">{displayName}</span>
            )}
            {!isAnonymous && (
              <span className={`hidden sm:inline-flex items-center gap-1 text-[10px] font-mono font-bold tracking-wider px-2 py-0.5 rounded-full border ${rank.color} ${rank.bg} ${rank.border}`}>
                <span className="uppercase">{rank.title}</span>
                <span className="opacity-50">·</span>
                <span>{score.toLocaleString()}</span>
              </span>
            )}
            {isAnonymous && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono font-bold tracking-wider px-2 py-0.5 rounded-full border border-purple-400/30 bg-purple-400/10 text-purple-400">
                <EyeSlashIcon className="w-3 h-3" />
                <span className="uppercase">Anonymous</span>
              </span>
            )}
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

const FactCheckBar = ({ sourceUrl, verifications, disputes, onVerify, onDispute, myId }) => {
  const verifyScore = verifications.reduce((sum, v) => sum + v.weight, 0);
  const disputeScore = disputes.reduce((sum, d) => sum + d.weight, 0);
  const totalScore = verifyScore + disputeScore;

  let status = 'Unverified';
  let statusColor = 'text-gray-400 border-gray-400/30 bg-gray-400/10';
  let StatusIcon = ShieldCheckIcon;

  // Threshold to determine if enough community trust data exists
  if (totalScore >= 3) {
    if (verifyScore > disputeScore * 2) {
      status = 'Verified';
      statusColor = 'text-green-400 border-green-400/30 bg-green-400/10';
      StatusIcon = CheckBadgeIcon;
    } else if (verifyScore > disputeScore) {
      status = 'Community Verified';
      statusColor = 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10';
      StatusIcon = ShieldCheckIcon;
    } else if (disputeScore > verifyScore * 2) {
      status = 'Misleading';
      statusColor = 'text-red-500 border-red-500/30 bg-red-500/10';
      StatusIcon = ExclamationTriangleIcon;
    } else {
      status = 'Disputed';
      statusColor = 'text-yellow-500 border-yellow-500/30 bg-yellow-500/10';
      StatusIcon = ExclamationTriangleIcon;
    }
  }

  const myVote = verifications.some(v => v.userId === myId) ? 'verify' : disputes.some(d => d.userId === myId) ? 'dispute' : null;
  
  // Extract domain for source link
  let domain = 'Source Link';
  try { if (sourceUrl) {domain = new URL(sourceUrl).hostname.replace('www.', '');} } catch(e){ console.warn('FactCheckBar: invalid sourceUrl', e); }

  return (
    <div className="mt-4 pt-3 border-t border-white/5 flex flex-col gap-3">
      {sourceUrl && (
        <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 hover:underline w-fit">
          <LinkIcon className="w-3.5 h-3.5" />
          {domain}
        </a>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${statusColor} text-[10px] font-bold uppercase tracking-wider`}>
          <StatusIcon className="w-3.5 h-3.5" />
          {status}
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => onVerify('verify')} 
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${myVote === 'verify' ? 'bg-green-500/20 border-green-500/40 text-green-400' : 'bg-white/5 border-white/10 text-gray-400 hover:text-green-400 hover:border-green-400/30'}`}
          >
            Verify
          </button>
          <button 
            onClick={() => onVerify('dispute')} 
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${myVote === 'dispute' ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'bg-white/5 border-white/10 text-gray-400 hover:text-red-400 hover:border-red-400/30'}`}
          >
            Dispute
          </button>
        </div>
      </div>
    </div>
  );
};

const EngagementStats = ({ counts, commentsCount }) => {
  const activeReactions = REACTION_TYPES.filter(rt => counts[rt.id] > 0);
  const hasReactions = activeReactions.length > 0;
  
  if (!hasReactions && !commentsCount) {return null;}

  return (
    <div className="flex items-center gap-4 text-xs text-gray-400 border-t border-white/5 pt-3 mt-1 flex-wrap">
      {activeReactions.map(rt => (
         <div key={rt.id} className="flex items-center gap-1.5" title={rt.label}>
            <span className="text-sm leading-none">{rt.icon}</span>
            <span className="font-medium text-white">{formatCount(counts[rt.id])}</span>
         </div>
      ))}
      {commentsCount > 0 && (
        <div className="flex items-center gap-1.5 ml-auto">
          <ChatBubbleLeftIcon className="h-3.5 w-3.5 text-neon" />
          <span className="font-medium text-white">{formatCount(commentsCount)}</span>
          <span className="hidden sm:inline">responses</span>
        </div>
      )}
    </div>
  );
};

const TalkActions = ({ reaction, onReact, isLoading, saved, onSave, onShare }) => {
  const [showMenu, setShowMenu] = useState(false);
  const activeReactionObj = REACTION_TYPES.find(r => r.id === reaction);

  return (
    <div className="flex items-center gap-3 mt-4 pt-1">
      <div 
        className="relative flex-1" 
        onMouseEnter={() => setShowMenu(true)} 
        onMouseLeave={() => setShowMenu(false)}
      >
        <AnimatePresence>
          {showMenu && (
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              className="absolute bottom-full left-0 mb-2 p-2 bg-black/90 border border-white/10 rounded-full shadow-xl flex gap-1 z-50 backdrop-blur-xl"
            >
              {REACTION_TYPES.map(rt => (
                <button
                  key={rt.id}
                  onClick={(e) => { e.stopPropagation(); onReact(rt.id); setShowMenu(false); }}
                  className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-full hover:scale-125 transition-all text-xl"
                  title={rt.label}
                >
                  {rt.icon}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onReact(reaction || 'like')}
          disabled={isLoading}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-full font-medium text-sm transition-all duration-200 ${
            reaction
              ? 'bg-neon/10 border border-neon text-neon shadow-glow-sm'
              : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:border-neon/30'
          } ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
        >
          {activeReactionObj ? (
             <span className="text-base leading-none">{activeReactionObj.icon}</span>
          ) : (
             <HeartIcon className="h-4 w-4" />
          )}
          <span>{activeReactionObj ? activeReactionObj.label : 'React'}</span>
        </motion.button>
      </div>

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
  const [commentAnon, setCommentAnon] = useState(false);

  const { comments: displayComments, expanded, loading, handleViewAll } =
    useCommentsExpander(comments, comments.length, null); // null means no fetch more

  if (!comments?.length && !showInput) {return null;}

  const previewCount = 2;
  const visibleComments = expanded ? displayComments : displayComments.slice(0, previewCount);
  const hasMore = comments.length > previewCount && !expanded;

  const submitCommentWrapper = () => {
    if (!commentText.trim()) {return;}
    onSubmitComment(commentAnon);
  };

  return (
    <div className="mt-4 pt-3 border-t border-white/5">
      <AnimatePresence initial={false}>
        {visibleComments.map((comment, idx) => {
          const isAnon = comment.isAnonymous;
          const cAvatar = isAnon ? 'https://ui-avatars.com/api/?name=A&background=0F0F0F&color=a855f7&bold=true' : (comment.author?.avatar || `https://ui-avatars.com/api/?name=${comment.author?.username || 'U'}&background=0F0F0F&color=22c55e&bold=true`);
          
          return (
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
                  <img src={cAvatar} alt="avatar" className="w-full h-full object-cover" />
                </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    to={getProfilePath(comment.author) || '#'}
                    onClick={(e) => {
                      if (isAnon || !getProfilePath(comment.author)) {
                        e.preventDefault();
                      }
                    }}
                    className={`font-semibold text-xs ${isAnon ? 'text-purple-400 cursor-default' : 'text-neon hover:underline'}`}
                  >
                    {isAnon ? <EyeSlashIcon className="w-3 h-3 inline mr-1 -mt-0.5" /> : null}
                    @{isAnon ? 'anonymous' : (comment.author?.username || 'anonymous')}
                  </Link>
                  <span className="text-gray-500 text-[10px]">
                    {timeAgoFn(comment.createdAt)}
                  </span>
                </div>
                <p className="text-gray-300 text-sm mt-0.5 break-words">{comment.content}</p>
              </div>
            </div>
          </motion.div>
        )})}
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
            <button
              onClick={() => setCommentAnon(!commentAnon)}
              className={`p-2.5 rounded-xl transition-colors ${commentAnon ? 'bg-purple-500/20 text-purple-400' : 'bg-white/5 text-gray-500 hover:text-gray-300'}`}
              title={commentAnon ? "Commenting Anonymously" : "Comment Publicly"}
            >
              <EyeSlashIcon className="w-4 h-4" />
            </button>
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a response..."
              className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-neon/50 transition-colors"
              onKeyPress={(e) => e.key === 'Enter' && submitCommentWrapper()}
              autoFocus
            />
            <button
              onClick={submitCommentWrapper}
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
    _id: post?._id || `post_${Date.now()}`,
    content: post?.content || '',
    author: post?.author || { username: 'Unknown', displayName: 'Unknown User' },
    likes: Array.isArray(post?.likes) ? post.likes : [],
    dislikes: Array.isArray(post?.dislikes) ? post.dislikes : [],
    comments: Array.isArray(post?.comments) ? post.comments : [],
    commentsCount: Number(post?.commentsCount || post?.comments?.length || 0),
    media: Array.isArray(post?.media) ? post.media : [],
    isAnonymous: post?.isAnonymous || false,
    createdAt: post?.createdAt || new Date().toISOString(),
    // Additional fields that might be accessed
    agrees: Array.isArray(post?.agrees) ? post.agrees : [],
    disagrees: Array.isArray(post?.disagrees) ? post.disagrees : [],
    facts: Array.isArray(post?.facts) ? post.facts : [],
    caps: Array.isArray(post?.caps) ? post.caps : [],
    misleadings: Array.isArray(post?.misleadings) ? post.misleadings : [],
    validPoints: Array.isArray(post?.validPoints) ? post.validPoints : [],
    verifications: Array.isArray(post?.verifications) ? post.verifications : [],
    disputes: Array.isArray(post?.disputes) ? post.disputes : [],
    sourceUrl: post?.sourceUrl || '',
    tags: Array.isArray(post?.tags) ? post.tags : [],
  };

  const myId = authUser?._id || authUser?.id || currentUserId;
  const { score: myCredScore } = useCredibility(myId);

  const initialCounts = {
    like: safePost.likes.length,
    dislike: safePost.dislikes.length,
    agree: safePost.agrees.length,
    disagree: safePost.disagrees.length,
    facts: safePost.facts.length,
    cap: safePost.caps.length,
    misleading: safePost.misleadings.length,
    validPoint: safePost.validPoints.length,
  };

  const initialReaction = useMemo(() => {
    for (const key of Object.keys(arrayKeyMap)) {
      if (safePost[arrayKeyMap[key]].some(id => String(id) === String(myId))) {
        return key;
      }
    }
    return null;
  }, [safePost, myId]);

  // Custom hooks
  const { reaction, counts, setReactionType } = useReactionOptimistic(
    initialReaction,
    initialCounts,
    () => {
      if (onLike && safePost._id) {onLike(safePost._id);}
    }
  );

  const { verifications, disputes, handleFactCheck } = useFactCheck(
    safePost._id,
    safePost.verifications,
    safePost.disputes,
    myId,
    myCredScore
  );

  const [localComments, setLocalComments] = useState(() => safePost.comments.map(normalizeComment));
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentText, setCommentText] = useState('');
  const fetchedCommentsRef = useRef(false);
  
  const [saved, setSaved] = useState(() => {
    try {
      return storageCache.isSaved(safePost._id);
    } catch(e) { return false; }
  });

  useEffect(() => {
    setLocalComments((prev) => mergeById([...prev, ...safePost.comments.map(normalizeComment)]));
  }, [safePost._id, safePost.comments]);

  useEffect(() => {
    let cancelled = false;
    const shouldFetch = safePost._id && safePost.commentsCount > localComments.length;
    if (!shouldFetch || fetchedCommentsRef.current) {
      return undefined;
    }

    fetchedCommentsRef.current = true;

    api.comments.getByPost(safePost._id)
      .then((res) => {
        if (cancelled) {
          return;
        }
        const fetched = res?.comments || res?.data?.comments || [];
        setLocalComments((prev) => mergeById([...prev, ...fetched.map(normalizeComment)]));
      })
      .catch((e) => console.warn('Failed to fetch comments', e));

    return () => { cancelled = true; };
  }, [safePost._id, safePost.commentsCount]);

  const handleReaction = (reactionType) => {
    if (reactionType === 'comment') {
      handleCommentToggle();
      return;
    }

    setReactionType(reactionType); // Update UI optimistically
    const authorId = safePost.author?._id || safePost.author?.id || safePost.author?.username;

    const localTalks = storageCache.getPosts();
    const idx = localTalks.findIndex(p => p._id === safePost._id);
    const updatedPost = idx !== -1 ? localTalks[idx] : { ...safePost };
    
    Object.values(arrayKeyMap).forEach(arr => {
      updatedPost[arr] = updatedPost[arr] || [];
    });

    const newReaction = reaction === reactionType ? null : reactionType;

    // Remove from all lists first
    Object.values(arrayKeyMap).forEach(arr => {
      updatedPost[arr] = updatedPost[arr].filter(uid => String(uid) !== String(myId));
    });
    
    // Deduct previous reaction credibility from author
    if (reaction) {
      updateCredibility(authorId, reaction, false);
    }

    if (newReaction) {
      updatedPost[arrayKeyMap[newReaction]].push(myId);
      
      // Add new reaction credibility to author
      updateCredibility(authorId, newReaction, true);
      
      if (String(safePost.author?._id || safePost.author?.id) !== String(myId)) {
        const reactionLabel = REACTION_TYPES.find(r => r.id === newReaction)?.label || newReaction;
        storageCache.addNotification({ 
          _id: `notif_react_${Date.now()}`, 
          type: 'like', 
          actor: authUser || { username: 'User' }, 
          text: `reacted with ${reactionLabel} to your talk`, 
          targetId: safePost._id, 
          targetText: safePost.content?.substring(0, 20), 
          read: false, 
          createdAt: new Date().toISOString() 
        });
        window.dispatchEvent(new Event('local_notify'));
      }
    }
    
    if (idx !== -1) {
      storageCache.updatePost(safePost._id, updatedPost);
    } else {
      storageCache.addPost(updatedPost);
    }

    // Fallback sync to backend if parent lacks handler
    try {
      if (api?.posts?.react) {api.posts.react(safePost._id, newReaction || 'remove');}
      else if (api?.posts?.interact) {api.posts.interact(safePost._id, newReaction || 'remove');}
    } catch (e) { console.warn('React sync failed', e); }
  };

  const handleCommentToggle = () => {
    setShowCommentInput(!showCommentInput);
  };

  const submitComment = async (isAnon) => {
    if (!commentText.trim()) {return;}
    const content = commentText.trim();
    const tempId = `comment_${Date.now()}`;
    const newComment = {
      _id: tempId,
      content,
      author: authUser || { username: 'Guest' },
      isAnonymous: isAnon,
      createdAt: new Date().toISOString()
    };
    setLocalComments(prev => mergeById([...prev, newComment]));

    const localTalks = storageCache.getPosts();
    const idx = localTalks.findIndex(p => p._id === safePost._id);
    if (idx !== -1) {
      const updatedPost = { ...localTalks[idx] };
      updatedPost.comments = [...(updatedPost.comments || []), newComment];
      storageCache.updatePost(safePost._id, updatedPost);
    }

    setCommentText('');
    setShowCommentInput(false);
    if (onComment) {onComment(safePost._id, content);}
    
    try {
      const res = await api.comments.add(safePost._id, content);
      const savedComment = normalizeComment(res?.comment || res?.data?.comment);
      if (savedComment?._id) {
        setLocalComments(prev => mergeById(prev.map(comment => comment._id === tempId ? savedComment : comment)));
        storageCache.updatePost(safePost._id, {
          comments: mergeById(localComments.map(c => c._id === tempId ? savedComment : c)),
        });
      }
    } catch (e) {
      console.warn('Failed to save comment to server', e);
    }
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

  const authorId = safePost.author?._id || safePost.author?.id || safePost.author;
  const showDelete = !!onDelete && !!myId && (
    String(authorId) === String(myId) || 
    String(safePost.author?.username) === String(authUser?.username) || 
    authUser?.role === 'admin'
  );

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
          isAnonymous={safePost.isAnonymous}
        />

        <TalkContent content={safePost.content} />

        <MediaGallery media={safePost.media} />

        <FactCheckBar 
          sourceUrl={safePost.sourceUrl} 
          verifications={verifications} 
          disputes={disputes} 
          onVerify={handleFactCheck} 
          onDispute={handleFactCheck} 
          myId={myId} 
        />

        <EngagementStats
          counts={counts}
          commentsCount={localComments.length}
        />

        <TalkActions
          reaction={reaction}
          onReact={handleReaction}
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
