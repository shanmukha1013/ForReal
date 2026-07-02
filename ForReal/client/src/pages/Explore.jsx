// -----------------------------------------------------------------------------
// Explore Page – Real‑time Discovery & Trending
// -----------------------------------------------------------------------------
// Enterprise‑grade discovery engine: trending debates, live rooms, top
// creators, real‑time search with debounce, staggered animations,
// glassmorphism cards, responsive grids, and premium loading states.
// -----------------------------------------------------------------------------

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  UserGroupIcon,
  ChatBubbleBottomCenterTextIcon,
  HashtagIcon,
  BoltIcon,
  TrophyIcon,
  ArrowLongRightIcon,
  XMarkIcon,
  SparklesIcon,
  ClockIcon,
  EyeIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline';
import Layout from '../components/Layout';

// -----------------------------------------------------------------------------
// Backward-compatible icon aliases
// (Explore.jsx originally used lucide-react icon identifiers. These aliases keep
// the existing JSX unchanged while removing the lucide-react dependency.)
// -----------------------------------------------------------------------------
const Search = MagnifyingGlassIcon;
const Users = UserGroupIcon;
const MessageSquare = ChatBubbleBottomCenterTextIcon;
const TrendingUp = BoltIcon;
const Hash = HashtagIcon;
const Zap = BoltIcon;
const Compass = BoltIcon;
const Award = TrophyIcon;
const ArrowRight = ArrowLongRightIcon;
const Filter = BoltIcon;
const X = XMarkIcon;
const Sparkles = SparklesIcon;
const Clock = ClockIcon;
const Eye = EyeIcon;
const UserPlus = UserPlusIcon;

import axios from '../api/axios';
import { storageCache } from '../lib/storageCache';
import { useCredibility } from '../hooks/useCredibility';

// -----------------------------------------------------------------------------
// Animation Variants
// -----------------------------------------------------------------------------
const pageEnter = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
};

const cardVariant = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.2 } },
};

const itemVariant = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.15 } },
};

const skeletonPulse = {
  animate: { opacity: [0.3, 0.6, 0.3], transition: { repeat: Infinity, duration: 1.8 } },
};

// -----------------------------------------------------------------------------
// Custom Hooks
// -----------------------------------------------------------------------------

/**
 * Debounced search that returns { results, loading, error }
 */
function useSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ users: [], posts: [], rooms: [] });
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(null);

  const performSearch = useCallback(async (q) => {
    if (!q || !String(q).trim()) {
      setResults({ users: [], posts: [], rooms: [] });
      return;
    }

    const searchQ = String(q).trim();

    if (abortRef.current) { abortRef.current.abort(); }
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    let fetched = { users: [], posts: [], rooms: [] };

    try {
      const data = await axios.get('/explore/search', {
        params: { q: searchQ },
        signal: controller.signal,
      });
      fetched = data || fetched;
    } catch (err) {
      if (!axios.isCancel(err)) {
        console.error('Search error:', err);
      }
    } finally {
      const qLower = searchQ.toLowerCase();
      const localPosts = storageCache.getPosts();
      const localRooms = storageCache.getRooms();

      const localUsers = [
        { _id: '1', username: 'smarty', displayName: 'Smarty', credibilityScore: 2500 },
        { _id: '2', username: 'test', displayName: 'TestUser', credibilityScore: 1200 }
      ];
      try {
        const storedUser = storageCache.getUser();
        if (storedUser && !localUsers.find(u => u._id === storedUser._id)) {
          localUsers.push(storedUser);
        }
      } catch (e) { console.warn('useSearch: failed to read stored user', e); }

      const matchedPosts = localPosts.filter(
        (p) => p.content?.toLowerCase().includes(qLower) || p.tags?.some((t) => t.toLowerCase().includes(qLower))
      );
      const matchedRooms = localRooms.filter(
        (r) => r.topic?.toLowerCase().includes(qLower) || r.description?.toLowerCase().includes(qLower)
      );
      const matchedUsers = localUsers.filter(
        (u) => u.username?.toLowerCase().includes(qLower) || u.displayName?.toLowerCase().includes(qLower)
      );

      setResults({
        users: Array.from(
          new Map([...(fetched.users || []), ...matchedUsers].map((u) => [u._id || u.username, u])).values()
        ).slice(0, 15),
        posts: Array.from(new Map([...(fetched.posts || []), ...matchedPosts].map(p => [p._id, p])).values()).slice(0, 15),
        rooms: Array.from(new Map([...(fetched.rooms || []), ...matchedRooms].map(r => [r._id, r])).values()).slice(0, 15)
      });

      setLoading(false);
      abortRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      try {
        if (abortRef.current) { abortRef.current.abort(); }
      } catch {
        // no-op
      }
    };
  }, []);


  const debounceRef = useRef();
  const handleChange = useCallback((e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => performSearch(val), 300);
  }, [performSearch]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults({ users: [], posts: [], rooms: [] });
  }, []);

  const handleTagClick = useCallback((tag) => {
    setQuery(tag);
    performSearch(tag);
  }, [performSearch]);

  return { query, results, loading, handleChange, clearSearch, handleTagClick };
}

/**
 * Fetch trending rooms, topics, and creators on mount.
 */
function useTrendingData() {
  const [rooms, setRooms] = useState([]);
  const [creators, setCreators] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    
    // SWR Cache Return
    const cachedTrending = sessionStorage.getItem('forreal_explore_trending');
    if (cachedTrending) {
      try {
        const parsed = JSON.parse(cachedTrending);
        setRooms(parsed.rooms || []);
        setCreators(parsed.creators || []);
        setTopics(parsed.topics || []);
        setLoading(false); // Instant load
      } catch(e) {}
    }

    const fetchAll = async () => {
      try {
        const [roomsRes, creatorsRes, topicsRes] = await Promise.all([
          axios.get('/explore/trending/rooms'),
          axios.get('/users/suggested'),
          axios.get('/explore/trending/topics'),
        ]);
        if (!cancelled) {
          const finalData = {
            rooms: roomsRes?.rooms || roomsRes || [],
            creators: creatorsRes?.suggestions || creatorsRes?.users || creatorsRes || [],
            topics: topicsRes?.topics || topicsRes || []
          };
          setRooms(finalData.rooms);
          setCreators(finalData.creators);
          setTopics(finalData.topics);
          sessionStorage.setItem('forreal_explore_trending', JSON.stringify(finalData));
        }
      } catch (err) {
        console.error('Trending data error:', err);
        if (!cancelled) {
          const localRooms = storageCache.getRooms();
          const activeRooms = localRooms.filter(r => r.status === 'active');
          activeRooms.sort((a,b) => (b.participants || 0) - (a.participants || 0));
          setRooms(activeRooms.length > 0 ? activeRooms : localRooms);
          
          setCreators([
            { _id: '1', username: 'smarty', displayName: 'Smarty', credibilityScore: 2500 },
            { _id: '2', username: 'test', displayName: 'TestUser', credibilityScore: 1200 }
          ]);

          const localPosts = storageCache.getPosts();
          const tagMap = {};
          localPosts.forEach(p => {
            (p.tags || []).forEach(tag => {
              const t = tag.toLowerCase();
              tagMap[t] = { tag, count: (tagMap[t]?.count || 0) + 1 };
            });
          });
          const dynamicTopics = Object.values(tagMap).sort((a,b) => b.count - a.count).slice(0, 10);

          setTopics(dynamicTopics.length > 0 ? dynamicTopics : [
            { tag: '#AI', count: 120 }, { tag: '#Tech', count: 85 }, { tag: '#Politics', count: 340 }
          ]);
        }
      } finally {
        if (!cancelled) {setLoading(false);}
      }
    };
    fetchAll();
    return () => { cancelled = true; };
  }, []);

  return { rooms, creators, topics, loading };
}

// -----------------------------------------------------------------------------
// Subcomponents
// -----------------------------------------------------------------------------

// Search Section – reusable list
const SearchSection = React.memo(({ title, icon: Icon, items, loading, emptyMessage, renderItem }) => {
  if (loading) {
    return (
      <motion.div
        variants={cardVariant}
        className="rounded-2xl p-5 glass-panel"
      >
        <div className="flex items-center gap-2 mb-4">
          <Icon className="w-5 h-5 text-brand" />
          <motion.div variants={skeletonPulse} animate="animate" className="h-5 w-24 bg-white/5 rounded" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <motion.div key={i} variants={skeletonPulse} animate="animate" className="h-12 bg-white/5 rounded-xl" />
          ))}
        </div>
      </motion.div>
    );
  }

  if (!items?.length) {
    return (
      <motion.div
        variants={cardVariant}
        className="rounded-2xl p-5 glass-panel"
      >
        <div className="flex items-center gap-2 mb-4">
          <Icon className="w-5 h-5 text-brand" />
          <h3 className="text-white font-semibold">{title}</h3>
        </div>
        <p className="text-gray-400 text-sm">{emptyMessage}</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={cardVariant}
      className="rounded-2xl overflow-hidden glass-panel"
    >
      <div className="flex items-center gap-2 p-4 border-b border-white/10">
        <Icon className="w-5 h-5 text-brand" />
        <h3 className="text-white font-semibold">{title}</h3>
        <span className="ml-auto text-xs text-gray-400">{items.length}</span>
      </div>
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="divide-y divide-white/5"
      >
        {items.map((item, idx) => (
          <motion.div key={item._id || idx} variants={itemVariant}>
            {renderItem(item)}
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
});
SearchSection.displayName = 'SearchSection';

// Creator Card
const CreatorCard = React.memo(({ creator }) => {
  const safeCreator = creator || {};
  const targetId = safeCreator._id || safeCreator.username;

  const [following, setFollowing] = useState(() => {
    try {
      const localFollows = storageCache.getFollows();
      return !!localFollows?.[targetId];
    } catch {
      return false;
    }
  });

  // If follow-changed fires elsewhere, reconcile quickly.
  useEffect(() => {
    const handler = (e) => {
      const changedId = e?.detail?.targetId;
      if (!targetId || !changedId || String(changedId) !== String(targetId)) {return;}
      try {
        const localFollows = storageCache.getFollows();
        setFollowing(!!localFollows?.[targetId]);
      } catch {
        // no-op
      }
    };
    window.addEventListener('forreal:follow:changed', handler);
    return () => window.removeEventListener('forreal:follow:changed', handler);
  }, [targetId]);

  const { score, rank } = useCredibility(safeCreator?._id || safeCreator?.username);
  const [followLoading, setFollowLoading] = useState(false);

  const toggleFollow = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation?.();

    if (!targetId) {return;}

    // optimistic
    const prev = following;
    setFollowing(!prev);

    try {
      if (!prev) {
        storageCache.addFollow(targetId);
      } else {
        storageCache.removeFollow(targetId);
      }

      // notify UI immediately
      window.dispatchEvent(
        new CustomEvent('forreal:follow:changed', { detail: { targetId, isFollowing: !prev } })
      );

      // backend reconciliation (defensive)
      setFollowLoading(true);
      try {
        if (!prev) {
          await axios.post(`/users/${targetId}/follow`);
        } else {
          await axios.delete(`/users/${targetId}/follow`);
        }

        // After success: trigger global refresh signal (profiles re-fetch via their own logic)
        window.dispatchEvent(new Event('local_notify'));
      } catch (apiErr) {
        // rollback optimistic UI
        setFollowing(prev);
        try {
          if (!prev) {storageCache.removeFollow(targetId);}
          else {storageCache.addFollow(targetId);}
        } catch {
          // no-op
        }
        window.dispatchEvent(
          new CustomEvent('forreal:follow:changed', { detail: { targetId, isFollowing: prev } })
        );
      }
    } finally {
      setFollowLoading(false);
    }
  }, [following, targetId]);

  return (
    <Link to={`/profile/${encodeURIComponent(safeCreator.username)}`} className="block p-4 hover:bg-white/5 transition-colors group">
      <div className="flex items-center gap-3">
        <img
          src={safeCreator.avatar || `https://ui-avatars.com/api/?name=${safeCreator.username || 'user'}&background=0F0F0F&color=22c55e`}
          alt={safeCreator.username}
          className="w-10 h-10 rounded-full border border-brand/30 object-cover"
        />
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium text-sm truncate">{safeCreator.displayName || safeCreator.username}</p>
          <p className="text-gray-400 text-xs">@{safeCreator.username}</p>
          {score !== undefined && (
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <div className="flex items-center gap-1" title="Credibility Score">
                <Award className={`w-3 h-3 ${rank?.color || 'text-brand'}`} />
                <span className={`text-[10px] font-mono ${rank?.color || 'text-brand'}`}>{Number(score || 0).toLocaleString()}</span>
              </div>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-md border ${rank?.bg || ''} ${rank?.border || ''} ${rank?.color || ''} uppercase tracking-wider`}>
                {rank?.title || ''}
              </span>
            </div>
          )}
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          disabled={followLoading}
          className={`hidden sm:flex items-center gap-1 px-3 py-1 rounded-full border text-xs font-medium transition disabled:opacity-60 ${following ? 'bg-brand/20 border-brand/50 text-brand' : 'bg-brand/10 border-brand/30 text-brand group-hover:bg-brand/20'}`}
          onClick={toggleFollow}
        >
          <UserPlus className="w-3 h-3" /> {following ? 'Following' : 'Follow'}
        </motion.button>
      </div>
    </Link>
  );
});
CreatorCard.displayName = 'CreatorCard';

// Room Card with live status and viewer count
const RoomCard = React.memo(({ room }) => (
  <Link to={`/rooms/${room._id}`}>
    <motion.div
      whileHover={{ scale: 1.02, borderColor: 'rgba(193,18,31,0.5)' }}
      className="group relative overflow-hidden rounded-xl p-4 transition-all duration-300 glass-card"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-neon/0 via-neon/5 to-neon/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="text-white font-semibold text-sm line-clamp-1">{room.topic}</h4>
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${room.status === 'active' ? 'bg-brand animate-pulse' : 'bg-gray-500'}`} />
                {room.status === 'active' ? 'Live' : 'Ended'}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" /> {room.spectators || 0}
              </span>
              {room.participants && (
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" /> {room.participants}
                </span>
              )}
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-brand transition-colors" />
        </div>
      </div>
    </motion.div>
  </Link>
));
RoomCard.displayName = 'RoomCard';

// Topic tag pill
const TopicPill = React.memo(({ topic, onClick }) => (
  <motion.div
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={() => onClick && onClick(topic.tag)}
    className="flex items-center gap-2 bg-white/5 backdrop-blur-md rounded-full px-4 py-2 border border-white/5 hover:border-brand/30 transition-all cursor-pointer"
  >
    <Hash className="w-4 h-4 text-brand" />
    <span className="text-sm font-medium text-white">{topic.tag}</span>
    <span className="text-[10px] text-gray-400">{topic.count} posts</span>
  </motion.div>
));
TopicPill.displayName = 'TopicPill';

// Skeleton for trending section
const TrendingSkeleton = () => (
  <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4">
    <motion.div variants={skeletonPulse} animate="animate" className="h-6 w-48 bg-white/5 rounded mb-2" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[...Array(4)].map((_, i) => (
        <motion.div key={i} variants={skeletonPulse} animate="animate" className="h-28 bg-white/5 rounded-xl" />
      ))}
    </div>
  </motion.div>
);

// -----------------------------------------------------------------------------
// Main Explore Component
// -----------------------------------------------------------------------------
export default function Explore() {
  const { query, results, loading: searchLoading, handleChange, clearSearch, handleTagClick } = useSearch();
  const { rooms, creators, topics, loading: trendingLoading } = useTrendingData();
  const [searchTab, setSearchTab] = useState('all');

  const hasSearch = query.trim().length > 0;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with search bar */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="relative mb-10"
        >
          <div className="relative max-w-2xl mx-auto">
            <div className="absolute inset-0 bg-brand/20 blur-3xl rounded-full opacity-20" />
            <div className="relative flex items-center">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={handleChange}
                placeholder="Search for talks, users, rooms..."
                className="w-full pl-12 pr-12 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:border-brand/50 focus:shadow-glow-sm transition-all duration-300"
              />
              {hasSearch && (
                <button
                  onClick={clearSearch}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Content: search results or trending */}
        <AnimatePresence mode="wait">
          {hasSearch ? (
            <motion.div
              key="search"
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={pageEnter}
              className="space-y-6"
            >
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide border-b border-white/10 mb-4">
                {[{id: 'all', label: 'All Results'}, {id: 'users', label: 'People'}, {id: 'rooms', label: 'Debates'}, {id: 'posts', label: 'Talks'}].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setSearchTab(tab.id)}
                    className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-all ${searchTab === tab.id ? 'text-brand border-b-2 border-brand bg-brand/5' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className={`grid grid-cols-1 ${searchTab === 'all' ? 'lg:grid-cols-3' : ''} gap-6`}>
                {(searchTab === 'all' || searchTab === 'users') && (
                  <SearchSection
                    title="People"
                    icon={Users}
                    items={results.users}
                    loading={searchLoading}
                    emptyMessage="No users found"
                    renderItem={(user) => (
                      <CreatorCard creator={user} key={user._id} />
                    )}
                  />
                )}
                {(searchTab === 'all' || searchTab === 'rooms') && (
                  <SearchSection
                    title="Debate Rooms"
                    icon={Hash}
                    items={results.rooms}
                    loading={searchLoading}
                    emptyMessage="No rooms match"
                    renderItem={(room) => (
                      <Link
                        to={`/rooms/${room._id}`}
                        className="block p-4 hover:bg-white/5 transition-colors"
                      >
                        <p className="text-white font-medium text-sm">{room.topic}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${room.status === 'active' ? 'bg-brand' : 'bg-gray-500'}`} />
                            {room.status}
                          </span>
                        <span>{Array.isArray(room.participants) ? room.participants.length : (room.participantCount || 0)} debaters</span>
                        </div>
                      </Link>
                    )}
                  />
                )}
                {(searchTab === 'all' || searchTab === 'posts') && (
                  <SearchSection
                    title="Talks"
                    icon={MessageSquare}
                    items={results.posts}
                    loading={searchLoading}
                    emptyMessage="No talks found"
                    renderItem={(post) => (
                      <Link to={`/profile/${post.author?.username || post.author?._id || 'anonymous'}`} className="block p-4 hover:bg-white/5 transition-colors cursor-pointer">
                        <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                          <span>@{post.author?.username || 'anonymous'}</span>
                          <span>•</span>
                          <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-gray-200 text-sm line-clamp-2">{post.content}</p>
                      </Link>
                    )}
                  />
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="trending"
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={pageEnter}
              className="space-y-12"
            >
              {/* Trending Debate Rooms */}
              <section>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-brand/10 border border-brand/30">
                      <Zap className="w-4 h-4 text-brand" />
                    </div>
                    <h2 className="text-xl font-bold text-white">Trending Debates</h2>
                  </div>
                  <Link to="/rooms" className="text-brand text-sm hover:underline flex items-center gap-1">
                    All Rooms <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                {trendingLoading ? (
                  <TrendingSkeleton />
                ) : (
                  <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                  >
                    {rooms.slice(0, 6).map((room) => (
                      <motion.div key={room._id} variants={cardVariant}>
                        <RoomCard room={room} />
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </section>

              {/* Suggested Creators */}
              <section>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-brand/10 border border-brand/30">
                      <Award className="w-4 h-4 text-brand" />
                    </div>
                    <h2 className="text-xl font-bold text-white">Top Creators</h2>
                  </div>
                  <Link to="/creators" className="text-brand text-sm hover:underline flex items-center gap-1">
                    Discover <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                {trendingLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                      <motion.div key={i} variants={skeletonPulse} animate="animate" className="h-20 bg-white/5 rounded-xl" />
                    ))}
                  </div>
                ) : (
                  <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
                  >
                    {creators.map((creator) => (
                      <motion.div
                        key={creator._id}
                        variants={cardVariant}
                        className="rounded-xl p-4 hover:border-brand/40 transition-all glass-card"
                      >
                        <CreatorCard creator={creator} />
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </section>

              {/* Hot Topics */}
              <section>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-brand/10 border border-brand/30">
                      <Sparkles className="w-4 h-4 text-brand" />
                    </div>
                    <h2 className="text-xl font-bold text-white">Hot Topics</h2>
                  </div>
                </div>
                {trendingLoading ? (
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {[...Array(5)].map((_, i) => (
                      <motion.div key={i} variants={skeletonPulse} animate="animate" className="h-10 w-28 bg-white/5 rounded-full flex-shrink-0" />
                    ))}
                  </div>
                ) : (
                  <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                    className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
                  >
                    {topics.map((topic) => (
                      <motion.div key={topic.tag} variants={cardVariant} className="flex-shrink-0">
                          <TopicPill topic={topic} onClick={handleTagClick} />
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
