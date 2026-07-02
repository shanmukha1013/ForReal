// -----------------------------------------------------------------------------
// Profile Page – Premium Creator Identity & Feed
// -----------------------------------------------------------------------------
// A production‑grade profile experience blending Instagram polish with
// Threads minimalism. Enterprise patterns: custom hooks, optimistic UI,
// staggered animations, glassmorphism, accessibility, and responsive design.
// -----------------------------------------------------------------------------

import React, {
  useState,
  useEffect,
  useCallback,
  useContext,
  useRef,
  useMemo,
} from 'react';
import {
  useParams,
  useNavigate,
} from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  Cog6ToothIcon as SettingsIcon,
  MapPinIcon,
  LinkIcon as LinkIconAlias,
  CalendarDaysIcon,
  PlusCircleIcon,
  UserGroupIcon as UsersIcon,
  ChatBubbleLeftIcon as MessageSquareIcon,
  HeartIcon,
  BoltIcon as ZapIcon,
  ShieldCheckIcon,
  ArrowTrendingUpIcon as TrendingUpIcon,
  Square3Stack3DIcon,
  ClockIcon,
  ArrowTopRightOnSquareIcon as ArrowUpRightIcon,
  CheckIcon,
  UserPlusIcon,
  Cog6ToothIcon as LoaderIcon,
  CameraIcon,
  PencilSquareIcon as Edit3Icon,
  ChevronDownIcon,
  SquaresPlusIcon as Grid3X3Icon,
  ChatBubbleBottomCenterTextIcon as MessageCircleIcon,
  BookmarkIcon,
  FilmIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline';

import Layout from '../components/Layout';
import PostCard from '../components/PostCard';
import { AuthContext } from '../context/AuthContext';
import { useNotification } from '../components/Notification';
import axios from '../api/axios';
import { fetchUserPosts, deletePost as apiDeletePost } from '../api/posts';
import { useCredibility } from '../hooks/useCredibility';
import { storageCache } from '../lib/storageCache';
import UserListModal from '../components/UserListModal';

// -----------------------------------------------------------------------------
// Backward-compatible icon aliases (removes lucide-react dependency)
// -----------------------------------------------------------------------------
const Settings = SettingsIcon;
const MapPin = MapPinIcon;
const LinkIcon = LinkIconAlias;
const Calendar = CalendarDaysIcon;
const PlusCircle = PlusCircleIcon;
const Users = UsersIcon;
const MessageSquare = MessageSquareIcon;
const Heart = HeartIcon;
const Zap = ZapIcon;
const ShieldCheck = ShieldCheckIcon;
const TrendingUp = TrendingUpIcon;
const Award = Square3Stack3DIcon;
const Clock = ClockIcon;
const ArrowUpRight = ArrowUpRightIcon;
const Check = CheckIcon;
const UserPlus = UserPlusIcon;
const UserCheck = CheckIcon;
const Loader = LoaderIcon;
const Camera = CameraIcon;
const Edit3 = Edit3Icon;
const ChevronDown = ChevronDownIcon;
const Grid3X3 = Grid3X3Icon;
const MessageCircle = MessageCircleIcon;
const Bookmark = BookmarkIcon;
const Film = FilmIcon;
const Trophy = TrophyIcon;

// -----------------------------------------------------------------------------
// Animation Variants (consistent with the rest of the app)
// -----------------------------------------------------------------------------
const pageContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const headerVariant = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

const statVariant = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const tabVariant = {
  inactive: { borderColor: 'rgba(255,255,255,0)', color: '#6b7280' },
  active: { borderColor: 'var(--neon, #C1121F)', color: 'var(--neon, #C1121F)' },
};

const postGridVariant = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const postItemVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const skeletonPulse = {
  animate: { opacity: [0.4, 0.8, 0.4], transition: { repeat: Infinity, duration: 1.5 } },
};

// -----------------------------------------------------------------------------
// Custom Hooks
// -----------------------------------------------------------------------------

/**
 * Fetch a user's profile by username or userId.
 * Returns { profile, loading, error, refetch }
 */
const useUserProfile = (username, currentUser) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const notify = useNotification();

  // Instantly clear stale profile state when routing to a new user
  const [prevUsername, setPrevUsername] = useState(username);
  if (username !== prevUsername) {
    setProfile(null);
    setPrevUsername(username);
  }

  const fetchProfile = useCallback(async () => {
    if (!username) { setLoading(false); return; }
    
    // Optimistic Cache Return (SWR Pattern)
    const cacheKey = `forreal_profile_cache_${username}`;
    const cachedData = sessionStorage.getItem(cacheKey);
    
    if (cachedData && !profile) {
      try {
        const parsed = JSON.parse(cachedData);
        setProfile(parsed);
        setLoading(false); // Instantly stop loading!
      } catch(e) {
        setLoading(true);
      }
    } else if (!profile) {
      setLoading(true);
    }

    const isMe = currentUser && (String(username) === String(currentUser.username) || String(username) === String(currentUser._id) || String(username) === String(currentUser.id));

    try {
      const data = await axios.get(`/users/${encodeURIComponent(username)}`);
      const finalProfile = isMe ? { ...currentUser, ...data, stats: data?.stats || currentUser.stats || { followersCount: 0, followingCount: 0, postsCount: 0 } } : data;
      
      // Update state and cache
      setProfile(finalProfile);
      sessionStorage.setItem(cacheKey, JSON.stringify(finalProfile));
      setError(null);
    } catch (err) {
      // Fallback to local context if fetching current user fails
      if (isMe) {
        setProfile({
          ...currentUser,
          stats: currentUser.stats || { followersCount: 0, followingCount: 0, postsCount: 0 }
        });
        setError(null);
      } else {
        if (!isMe) {
          setError('Profile not found');
          notify.error('Could not load profile');
        }
      }
    } finally {
      setLoading(false);
    }
  }, [username, notify, currentUser]);

  useEffect(() => {
    fetchProfile();
    const handleEvent = () => {
      fetchProfile();
      setRefreshTrigger(prev => prev + 1);
    };
    window.addEventListener('local_post_created', handleEvent);
    return () => window.removeEventListener('local_post_created', handleEvent);
  }, [fetchProfile]);

  const displayProfile = useMemo(() => {
    const _ = refreshTrigger; // force re-evaluation
    if (!profile) {return null;}
    const p = { ...profile };
    const localPosts = storageCache.getPosts();
    const userPostsCount = localPosts.filter(post => 
      String(post.author?._id || post.author?.id || post.author) === String(p._id || p.id)
    ).length;
    
    p.stats = { ...(p.stats || { followersCount: 0, followingCount: 0, postsCount: 0 }) };
    p.stats.postsCount = Math.max(p.stats.postsCount || 0, userPostsCount);
    return p;
  }, [profile, refreshTrigger]);

  return { profile: displayProfile, loading, error, refetch: fetchProfile };
};

/**
 * Fetch paginated posts of a user.
 * Returns { posts, loading, hasMore, loadMore, deleteTalk }
 */
const useUserPosts = (userId, limit = 12) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const pageRef = useRef(1);
  const abortRef = useRef(null);

  const fetchPosts = useCallback(
    async (page = 1, append = false) => {
      if (abortRef.current) { abortRef.current.abort(); }
      const controller = new AbortController();
      abortRef.current = controller;

      if (!userId) { setPosts([]); setLoading(false); return; }
      if (page === 1 && !append) {setPosts([]);}
      setLoading(true);
      let fetchedPosts = [];
      try {
        const res = await fetchUserPosts(userId, { page, limit });
        if (controller.signal.aborted) {return;}
        fetchedPosts = res?.posts || (Array.isArray(res) ? res : []);
      } catch (err) {
        if (controller.signal.aborted) {return;}
        console.warn('API fetch failed, using local cache', err);
      } finally {
        const localPosts = storageCache.getPosts();
        const userPosts = localPosts.filter(p => 
          String(p.author?._id || p.author?.id || p.author) === String(userId)
        );
        
        const allPosts = [...fetchedPosts, ...userPosts];
        const validPosts = allPosts.filter(post => String(post.author?._id || post.author?.id || post.author) === String(userId));
        const unique = Array.from(new Map(validPosts.map(p => [p._id, p])).values());
        unique.sort((a,b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        
        const paginated = unique.slice((page - 1) * limit, page * limit);
        
        setPosts(prev => {
          const next = append ? [...prev, ...paginated] : paginated;
          return Array.from(new Map(next.map(p => [p._id, p])).values());
        });
        setHasMore(unique.length > page * limit);
        pageRef.current = page;
        setLoading(false);
      }
    },
    [userId, limit]
  );

  useEffect(() => {
    fetchPosts(1);
  }, [fetchPosts]);

  useEffect(() => {
    const syncFromCache = () => {
      if (!userId) {return;}
      const cachedPosts = storageCache.getPosts();
      const userPosts = cachedPosts
        .filter(p => String(p.author?._id || p.author?.id || p.author) === String(userId))
        .sort((a,b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        
        setPosts(prev => {
          const all = [...prev, ...userPosts];
          const unique = Array.from(new Map(all.map(p => [p._id, p])).values());
          unique.sort((a,b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
          return unique;
        });
    };

    const unsubscribe = storageCache.subscribe('posts', syncFromCache);
    window.addEventListener('local_post_created', syncFromCache);
    return () => {
      unsubscribe();
      window.removeEventListener('local_post_created', syncFromCache);
    };
  }, [userId]);



  const loadMore = useCallback(() => {
    if (!hasMore) {return;}
    fetchPosts(pageRef.current + 1, true);
  }, [fetchPosts, hasMore]);

  const deleteTalk = useCallback(async (id) => {
    setPosts((prev) => prev.filter((t) => t._id !== id));
    storageCache.deletePost(id);
    try {
      await apiDeletePost(id);
    } catch (err) {
      console.error('Failed to delete post on server', err);
    }
  }, []);

  return { posts, loading, hasMore, loadMore, refetch: fetchPosts, deleteTalk };
};

/**
 * Optimistic follow/unfollow toggle.
 */
const useFollowToggle = (initialFollowing, targetUserId, onUpdate) => {
  const [following, setFollowing] = useState(() => {
    const localFollows = storageCache.getFollows();
    const v = localFollows?.[targetUserId];
    return (initialFollowing !== undefined ? initialFollowing : v) || false;
  });
  const [loading, setLoading] = useState(false);
  const { user } = useContext(AuthContext);
  const notify = useNotification();

  useEffect(() => {
    const localFollows = storageCache.getFollows();
    const v = localFollows?.[targetUserId];
    setFollowing(initialFollowing ?? v ?? false);
  }, [initialFollowing, targetUserId]);

  const toggle = useCallback(async () => {
    if (!user) {return notify.error('Sign in to follow');}
    setLoading(true);
    const prev = following;
    setFollowing(!prev);

    if (!prev) {storageCache.addFollow(targetUserId);}
    else {storageCache.removeFollow(targetUserId);}

    try {
        if (!prev) {
        const result = await axios.post(`/users/${encodeURIComponent(targetUserId)}/follow`);
        if (onUpdate) {onUpdate(true, result);}
      } else {
        const result = await axios.delete(`/users/${encodeURIComponent(targetUserId)}/follow`);
        if (onUpdate) {onUpdate(false, result);}
      }
    } catch (err) {
      setFollowing(prev);
      if (!prev) {storageCache.removeFollow(targetUserId);}
      else {storageCache.addFollow(targetUserId);}
      notify.error(err?.message || 'Could not update follow');
    } finally {
      setLoading(false);
    }
  }, [following, user, targetUserId, notify, onUpdate]);

  return { following, loading, toggle };
};

// -----------------------------------------------------------------------------
// Subcomponents
// -----------------------------------------------------------------------------

const ProfileSkeleton = () => (
  <div className="animate-pulse space-y-6 p-4 md:p-8 max-w-4xl mx-auto">
    {/* Header skeleton */}
    <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
      <motion.div
        variants={skeletonPulse}
        animate="animate"
        className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-white/5"
      />
      <div className="flex-1 space-y-3 text-center md:text-left">
        <motion.div variants={skeletonPulse} animate="animate" className="h-6 w-48 bg-white/5 rounded mx-auto md:mx-0" />
        <motion.div variants={skeletonPulse} animate="animate" className="h-4 w-32 bg-white/5 rounded mx-auto md:mx-0" />
        <div className="flex gap-4 justify-center md:justify-start">
          {[...Array(3)].map((_, i) => (
            <motion.div key={i} variants={skeletonPulse} animate="animate" className="h-4 w-16 bg-white/5 rounded" />
          ))}
        </div>
      </div>
      <motion.div variants={skeletonPulse} animate="animate" className="h-10 w-28 bg-white/5 rounded-full" />
    </div>
    {/* Tabs skeleton */}
    <div className="flex gap-6 border-b border-white/10">
      {[...Array(4)].map((_, i) => (
        <motion.div key={i} variants={skeletonPulse} animate="animate" className="h-8 w-16 bg-white/5 rounded" />
      ))}
    </div>
    {/* Posts skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[...Array(4)].map((_, i) => (
        <motion.div key={i} variants={skeletonPulse} animate="animate" className="h-48 bg-white/5 rounded-xl" />
      ))}
    </div>
  </div>
);

const ProfileCover = React.memo(({ profile }) => (
  <div className="relative h-32 md:h-48 rounded-2xl overflow-hidden bg-gradient-to-r from-neon/10 via-purple-500/10 to-blue-500/10 border border-white/10 mb-6">
    {profile?.coverImage && (
      <img
        src={profile.coverImage}
        alt="Cover"
        className="w-full h-full object-cover"
      />
    )}
    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
  </div>
));
ProfileCover.displayName = 'ProfileCover';

const ProfileAvatar = React.memo(({ profile }) => {
  const avatarSrc = profile?.avatar || `https://ui-avatars.com/api/?name=${profile?.displayName || 'U'}&background=0F0F0F&color=22c55e&bold=true`;
  return (
    <div className="relative -mt-16 md:-mt-20 mb-4 flex justify-center md:justify-start md:pl-4">
      <motion.div
        whileHover={{ scale: 1.03 }}
        transition={{ type: 'spring', stiffness: 300 }}
        className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-black bg-gradient-to-br from-neon/40 to-black p-[3px] shadow-glow-sm"
      >
        <img
          src={avatarSrc}
          alt={profile?.displayName}
          className="w-full h-full rounded-full object-cover bg-black"
        />
      </motion.div>
    </div>
  );
});
ProfileAvatar.displayName = 'ProfileAvatar';

const StatsBar = React.memo(({ stats, onOpenFollowers, onOpenFollowing }) => (
  <motion.div
    variants={pageContainer}
    initial="hidden"
    animate="visible"
    className="flex flex-wrap justify-center md:justify-start gap-6 md:gap-8 mt-2 text-sm md:text-base"
  >
    {[
      { label: 'Followers', value: stats?.followersCount ?? 0, onClick: onOpenFollowers },
      { label: 'Following', value: stats?.followingCount ?? 0, onClick: onOpenFollowing },
      { label: 'Posts', value: stats?.postsCount ?? 0 },
    ].map(({ label, value, onClick }) => (
      <motion.div
        key={label}
        variants={statVariant}
        className={`text-center ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
        onClick={onClick}
      >
        <span className="font-bold text-white">{Number(value || 0).toLocaleString()}</span>
        <span className="text-gray-400 ml-1">{label}</span>
      </motion.div>
    ))}
  </motion.div>
));
StatsBar.displayName = 'StatsBar';

const CredibilityBadge = React.memo(({ cred, rank }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    className={`flex items-center gap-2 mt-4 px-4 py-2 rounded-full border backdrop-blur-md w-fit ${rank.bg} ${rank.border}`}
  >
    <Award className={`w-4 h-4 ${rank.color}`} />
    <span className={`text-sm font-bold ${rank.color}`}>Credibility Score: </span>
    <motion.span
      key={cred}
      initial={{ scale: 1.5, color: '#ffffff' }}
      animate={{ scale: 1, color: 'inherit' }}
      className={`text-sm font-mono font-bold ${rank.color}`}
    >
      {Number(cred || 0).toLocaleString()}
    </motion.span>
  </motion.div>
));
CredibilityBadge.displayName = 'CredibilityBadge';

const FollowButton = React.memo(({ profile, isOwnProfile, onFollowChange }) => {
  const { user } = useContext(AuthContext);
  const { following, loading, toggle } = useFollowToggle(
    profile?.isFollowing,
    profile?._id,
    onFollowChange
  );

  if (isOwnProfile) {return null;}

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.96 }}
      disabled={loading || !user}
      onClick={toggle}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm transition-all duration-200 border ${
        following
          ? 'bg-brand/10 border-brand/40 text-brand hover:bg-brand/20'
          : 'bg-brand text-white border-brand hover:bg-brand/90'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {loading ? (
        <Loader className="w-4 h-4 animate-spin" />
      ) : following ? (
        <UserCheck className="w-4 h-4" />
      ) : (
        <UserPlus className="w-4 h-4" />
      )}
      {following ? 'Following' : profile?.isFollower ? 'Follow back' : 'Follow'}
    </motion.button>
  );
});
FollowButton.displayName = 'FollowButton';

const ProfileTabs = React.memo(({ activeTab, onChange }) => {
  const tabs = [
    { key: 'posts', label: 'Talks', icon: Grid3X3 },
    { key: 'replies', label: 'Replies', icon: MessageCircle },
    { key: 'media', label: 'Media', icon: Film },
    { key: 'saved', label: 'Saved', icon: Bookmark },
  ];

  return (
    <div className="flex justify-center md:justify-start border-b border-white/10 mb-6 overflow-x-auto scrollbar-hide">
      {tabs.map(({ key, label, icon: Icon }) => (
        <motion.button
          key={key}
          onClick={() => onChange(key)}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors duration-200 whitespace-nowrap ${
            activeTab === key
              ? 'text-brand border-b-2 border-brand'
              : 'text-gray-400 hover:text-white'
          }`}
          whileTap={{ scale: 0.97 }}
        >
          <Icon className="w-4 h-4" />
          {label}
        </motion.button>
      ))}
    </div>
  );
});
ProfileTabs.displayName = 'ProfileTabs';

const UserFeed = React.memo(({ userId, activeTab }) => {
  const safeUserId = userId ? String(userId) : '';
  const { posts, loading, hasMore, loadMore, deleteTalk } = useUserPosts(safeUserId);
  const bottomRef = useRef(null);
  const isInView = useInView(bottomRef, { once: false, margin: '0px 0px 200px 0px' });

  useEffect(() => {
    if (isInView && !loading && hasMore) {loadMore();}
  }, [isInView, loading, hasMore, loadMore]);

  // For now, we only show posts; other tabs can be implemented similarly
  if (activeTab !== 'posts') {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-500">
        <Film className="w-12 h-12 mb-4 opacity-30" />
        <p className="text-sm">No content yet.</p>
      </div>
    );
  }

  return (
    <motion.div
      variants={postGridVariant}
      initial="hidden"
      animate="visible"
      className="space-y-4"
    >
      {loading && posts.length === 0 ? (
        // Skeleton grid
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              variants={skeletonPulse}
              animate="animate"
              className="h-40 rounded-xl bg-white/5"
            />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <PlusCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No talks yet. Start a debate!</p>
        </div>
      ) : (
        posts.map((post) => (
          <motion.div key={post._id} variants={postItemVariant}>
            <PostCard
              post={post}
              onDelete={deleteTalk}
            />
          </motion.div>
        ))
      )}

      {loading && posts.length > 0 && (
        <div className="flex justify-center py-4">
          <motion.div 
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-2 h-2 bg-[#C1121F] rounded-full"
          />
        </div>
      )}

      <div ref={bottomRef} className="h-1" />
    </motion.div>
  );
});
UserFeed.displayName = 'UserFeed';

// -----------------------------------------------------------------------------
// Main Profile Component
// -----------------------------------------------------------------------------
export default function Profile() {
  const { username } = useParams();
  const { user: currentUser } = useContext(AuthContext);
  const navigate = useNavigate();


  // Fetch profile based on URL param or fallback to current user
  const targetUsername = username || currentUser?.username || currentUser?._id || currentUser?.id;
  const { profile, loading: profileLoading, error } = useUserProfile(targetUsername, currentUser);
  const isOwnProfile = !!(currentUser && profile && (
    String(profile._id || profile.id || profile.username) === String(currentUser._id || currentUser.id || currentUser.username) ||
    String(profile.username) === String(currentUser.username)
  ));
  const { score, rank } = useCredibility(targetUsername);
  const notify = useNotification();


  const [activeTab, setActiveTab] = useState('posts');
  const [statsOverride, setStatsOverride] = useState(null);
  
  // Modal State
  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', fetchType: null });
  
  const openFollowers = useCallback(() => {
    setModalConfig({ isOpen: true, title: 'Followers', fetchType: 'followers' });
  }, []);
  
  const openFollowing = useCallback(() => {
    setModalConfig({ isOpen: true, title: 'Following', fetchType: 'following' });
  }, []);
  
  const closeListModal = useCallback(() => {
    setModalConfig(prev => ({ ...prev, isOpen: false }));
  }, []);

  useEffect(() => {
    setStatsOverride(profile?.stats || null);
  }, [profile?._id, profile?.stats?.followersCount, profile?.stats?.followingCount, profile?.stats?.postsCount]);

  const displayProfile = useMemo(() => (
    profile ? { ...profile, stats: statsOverride || profile.stats } : profile
  ), [profile, statsOverride]);

  const handleFollowChange = useCallback((isFollowing, result) => {
    setStatsOverride((prev) => ({
      ...(prev || profile?.stats || {}),
      followersCount: result?.data?.followersCount ?? result?.followersCount ?? Math.max(0, Number((prev || profile?.stats)?.followersCount || 0) + (isFollowing ? 1 : -1)),
    }));
    window.dispatchEvent(new CustomEvent('forreal:follow:changed', {
      detail: { targetId: profile?._id, isFollowing },
    }));
  }, [profile?._id, profile?.stats]);

  // If no username and no current user, redirect to login
  useEffect(() => {
    if (!targetUsername && !currentUser) {
      navigate('/auth');
    }
  }, [targetUsername, currentUser, navigate]);

  // Show skeleton while loading
  if (profileLoading) {return <ProfileSkeleton />;}

  // Error state
  if (!displayProfile && !error) { return <ProfileSkeleton />; }

  if (error) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <ShieldCheck className="w-16 h-16 text-red-400 mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">User not found</h2>
          <p className="text-gray-400 text-sm mb-4">This account doesn’t exist or may have been removed.</p>
          <button
            onClick={() => navigate(-1)}
            className="text-brand hover:underline text-sm font-medium"
          >
            ← Go back
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <motion.div
        variants={pageContainer}
        initial="hidden"
        animate="visible"
        className="max-w-4xl mx-auto px-4 md:px-6 pt-4 pb-20 md:pb-8"
      >
        {/* Cover Image */}
        <ProfileCover profile={displayProfile} />

        {/* Profile Header */}
        <motion.div
          variants={headerVariant}
          className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-6"
        >
          {/* Left: Avatar + mobile stats */}
          <div className="flex flex-col items-center md:items-start">
            <ProfileAvatar profile={displayProfile} />
            <StatsBar stats={displayProfile?.stats} onOpenFollowers={openFollowers} onOpenFollowing={openFollowing} />
          </div>

          {/* Right: Info & actions */}
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center md:items-start md:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 justify-center md:justify-start">
                  <h1 className="text-2xl md:text-3xl font-bold text-white">
                    {displayProfile?.displayName || displayProfile?.username}
                  </h1>
                  {displayProfile?.verified && (
                    <span className="text-success" title="Verified">
                      <ShieldCheck className="w-5 h-5" />
                    </span>
                  )}
                </div>
                <p className="text-gray-400 text-sm md:text-base">
                  @{displayProfile?.username}
                  <span className={`ml-2 text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border ${rank.bg} ${rank.color} ${rank.border}`}>
                    {rank.title}
                  </span>
                </p>
                {displayProfile?.bio && (
                  <p className="mt-2 text-gray-300 text-sm max-w-md">{displayProfile.bio}</p>
                )}
                <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-gray-500 justify-center md:justify-start">
                  {displayProfile?.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {displayProfile.location}
                    </span>
                  )}
                  {displayProfile?.website && (
                    <a
                      href={displayProfile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-brand hover:underline"
                    >
                      <LinkIcon className="w-3 h-3" /> Website
                    </a>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Joined {displayProfile?.createdAt ? new Date(displayProfile.createdAt).toLocaleDateString() : 'recently'}
                  </span>
                </div>
                <CredibilityBadge cred={score} rank={rank} />
              </div>

              <div className="flex items-center gap-2">
                {isOwnProfile ? (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => navigate('/settings')}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition text-sm"
                  >
                    <Edit3 className="w-4 h-4" /> Edit Profile
                  </motion.button>
                ) : (
                  <>
                    <FollowButton profile={displayProfile} isOwnProfile={isOwnProfile} onFollowChange={handleFollowChange} />
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => navigate(`/messages?user=${encodeURIComponent(displayProfile?._id || displayProfile?.id || displayProfile?.username)}`)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition text-sm"
                    >
                      <MessageSquare className="w-4 h-4" /> Message
                    </motion.button>
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs & Feed */}
        <div className="mt-8">
          <ProfileTabs activeTab={activeTab} onChange={setActiveTab} />
          <UserFeed userId={displayProfile?._id || displayProfile?.id} activeTab={activeTab} />
        </div>
      </motion.div>
      
      <UserListModal
        isOpen={modalConfig.isOpen}
        onClose={closeListModal}
        title={modalConfig.title}
        fetchType={modalConfig.fetchType}
        userId={displayProfile?._id || displayProfile?.id}
      />
    </Layout>
  );
}
