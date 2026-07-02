import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useContext,
  useMemo,
} from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  SparklesIcon,
  PlusCircleIcon,
  ArrowPathIcon,
  ArrowTrendingUpIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';

import Layout from '../components/Layout';
import PostCard from '../components/PostCard';
import { AuthContext } from '../context/AuthContext';
import { useNotification } from '../components/Notification';
import axios from '../api/axios';
import { storageCache } from '../lib/storageCache';
import { fetchPosts as apiFetchPosts, createPost as apiCreatePost, deletePost as apiDeletePost } from '../api/posts';

// Optional: keep socket/auth related guards from crashing Home during auth transitions.


// Backward-compatible icon aliases
const Zap = SparklesIcon;
const Plus = PlusCircleIcon;
const RefreshCw = ArrowPathIcon;
const TrendingUp = ArrowTrendingUpIcon;
const MessageSquare = ChatBubbleLeftRightIcon;

// Custom Hook: useFeed - Fetch talks with infinite scroll
const useFeed = (limit = 10) => {
  const [talks, setTalks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const pageRef = useRef(1);
  const abortRef = useRef(null);

  const fetchTalks = useCallback(
    async (page = 1, append = false) => {
      if (abortRef.current) {abortRef.current.abort();}
      const controller = new AbortController();
      abortRef.current = controller;

      const isInitial = page === 1 && !append;
      if (isInitial) {setLoading(true);}
      else {setLoadingMore(true);}

      let fetchedTalks = [];
      try {
        // Try API first
        try {
          const { posts, pagination } = await apiFetchPosts({ page, limit });
          fetchedTalks = posts || [];
          setHasMore(pagination?.hasMore ?? false);
        } catch (apiErr) {
          // Fallback to localStorage
          fetchedTalks = storageCache.getPosts();
          setHasMore(false);
        }
        setError(null);
      } catch (err) {
        if (axios.isCancel?.(err)) {return;}
        setError(err?.message || 'Failed to fetch feed');
        return;
      } finally {
        const localTalks = storageCache.getPosts();
        const allTalks = [...fetchedTalks, ...localTalks];
        const unique = Array.from(new Map(allTalks.map(t => [t._id, t])).values());
        unique.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        const paginated = unique.slice((page - 1) * limit, page * limit);
        
                setTalks((prev) => {
          if (!append) {
             try { localStorage.setItem('forreal_posts', JSON.stringify(paginated.slice(0, 20))); } catch(e) {}
             return paginated;
          }
          const merged = [...prev, ...paginated];
          const uniqueMerged = Array.from(new Map(merged.map(t => [t._id, t])).values());
          try { localStorage.setItem('forreal_posts', JSON.stringify(uniqueMerged.slice(0, 20))); } catch(e) {}
          return uniqueMerged;
        });
        pageRef.current = page;
        if (isInitial) {setLoading(false);}
        else {setLoadingMore(false);}
      }
    },
    [limit]
  );

  useEffect(() => {
    fetchTalks(1);
    return () => {
      if (abortRef.current) {abortRef.current.abort();}
    };
  }, [fetchTalks]);

  useEffect(() => {
    const unsubscribe = storageCache.subscribe('posts', (updatedPosts) => {
      setTalks((prev) => {
        // Merge instead of replace to prevent feed shrinkage on pagination
        const merged = [...prev, ...(updatedPosts || [])];
        const unique = Array.from(new Map(merged.map(t => [t._id, t])).values());
        unique.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        return unique.slice(0, Math.max(limit, prev.length || limit));
      });
    });
    return unsubscribe;
  }, [limit]);

  const refresh = useCallback(() => {
    fetchTalks(1);
  }, [fetchTalks]);

  const addTalk = useCallback((newTalk) => {
    setTalks((prev) => {
      if (prev.some((t) => t._id === newTalk._id)) {return prev;}
      return [newTalk, ...prev];
    });
  }, []);

  const deleteTalk = useCallback(async (id) => {
    setTalks((prev) => prev.filter((t) => t._id !== id));
    storageCache.deletePost(id);
    try {
      await apiDeletePost(id);
    } catch (err) {
      console.error('Failed to delete post on server', err);
    }
  }, []);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) {return;}
    fetchTalks(pageRef.current + 1, true);
  }, [fetchTalks, loadingMore, hasMore]);

  return {
    talks,
    loading,
    loadingMore,
    hasMore,
    error,
    refresh,
    loadMore,
    addTalk,
    deleteTalk,
  };
};

const FeedSkeleton = () => (
  <div className="space-y-4">
    {Array.from({ length: 5 }).map((_, i) => (
      <div
        key={i}
        className="h-[180px] rounded-2xl animate-pulse glass-panel"
      />
    ))}
  </div>
);

export default function Home() {
  const { user, isAuthenticated } = useContext(AuthContext);
  const notify = useNotification();

  const {
    talks,
    loading,
    loadingMore,
    hasMore,
    error,
    refresh,
    loadMore,
    addTalk,
    deleteTalk,
  } = useFeed(10);

  const [composeText, setComposeText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateTalk = async () => {
    if (!composeText.trim()) {return;}
    setIsSubmitting(true);
    try {
      const newPost = await apiCreatePost({ content: composeText.trim() });
      storageCache.addPost(newPost);
      addTalk(newPost);
      // Ensure profile feed renders immediately without requiring a manual refresh
      // (Profile.jsx fetches using fetchUserPosts; backend returns populated author.)
      window.dispatchEvent(new Event('local_post_created'));
      setComposeText('');
      if (notify?.success) { notify.success('Talk published successfully!'); }
    } catch (err) {
      if (notify?.error) {notify.error(err.message || 'Failed to publish talk');}
    } finally {
      setIsSubmitting(false);
    }
  };

  const emptyState = useMemo(() => {
    if (error) {return { title: 'Failed to load feed', detail: error };}
    return { title: 'No talks yet', detail: 'Be the first to start a debate.' };
  }, [error]);

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-brand/10 border border-brand/30">
                <Zap className="w-6 h-6 text-brand" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-brand">
                Raw Debates
              </h1>
            </div>
            <p className="text-gray-400 mt-2">
              Real voices. No filters. Pick a talk and join the arena.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                refresh();
                if (notify?.info) {notify.info('Refreshing feed...');}
              }}
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
              title="Refresh feed"
            >
              <RefreshCw className="w-4 h-4 text-brand" />
            </motion.button>

            {!isAuthenticated && (
              <Link
                to="/login"
                className="px-4 py-2.5 rounded-xl bg-brand text-white font-bold text-sm hover:bg-brand/90 transition"
              >
                Sign in to participate
              </Link>
            )}
          </div>
        </motion.div>

        {/* Talk Composer */}
        {isAuthenticated && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 sm:p-5 mb-6 rounded-2xl overflow-hidden glass-panel"
          >
            <div className="flex gap-4">
              <img
                src={user?.avatar || `https://api.dicebear.com/7.x/shapes/svg?seed=${user?.username || 'user'}`}
                alt="avatar"
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border border-white/10 flex-shrink-0"
              />
              <div className="flex-1">
                <textarea
                  value={composeText}
                  onChange={(e) => setComposeText(e.target.value)}
                  placeholder="What's your take? Speak your truth..."
                  className="w-full bg-transparent border-none text-brand placeholder-gray-500 focus:outline-none focus:ring-0 resize-none text-sm sm:text-base min-h-[80px]"
                />
                <div className="flex justify-between items-center mt-2 pt-3 border-t border-white/10">
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-brand" /> Keep it real. No fake news.
                  </div>
                  <button
                    onClick={handleCreateTalk}
                    disabled={!composeText.trim() || isSubmitting}
                    className="px-5 py-2 bg-brand text-white font-bold rounded-full text-sm disabled:opacity-50 hover:bg-brand/90 transition shadow-glow-sm disabled:shadow-none flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <><div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> Publishing...</>
                    ) : ('Post Talk')}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {loading ? (
          <FeedSkeleton />
        ) : talks.length === 0 ? (
          <div className="text-center py-16 rounded-2xl overflow-hidden glass-panel">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
              <MessageSquare className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="text-brand font-semibold text-lg">{emptyState.title}</h3>
            <p className="text-gray-400 text-sm mt-1">{emptyState.detail}</p>
            {!isAuthenticated ? (
              <div className="mt-5">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand text-white font-bold hover:bg-brand/90 transition"
                >
                  <Plus className="w-4 h-4" /> Sign in
                </Link>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="space-y-4">
            {talks.map((post) => (
              <motion.div
                key={post._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              >
                <PostCard post={post} onDelete={deleteTalk} />
              </motion.div>
            ))}
          </div>
        )}

        {(error || talks.length > 0) && (
          <div className="flex justify-center">
            <motion.button
              whileHover={{ scale: (loadingMore || !hasMore) ? 1 : 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={loadMore}
              disabled={loadingMore || !hasMore}
              className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold text-gray-200 hover:border-brand/50 hover:text-brand transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingMore ? 'Loading...' : hasMore ? 'Load more' : 'You’re caught up'}
            </motion.button>
          </div>
        )}
      </div>
    </Layout>
  );
}
