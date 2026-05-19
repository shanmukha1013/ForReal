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
  active: { borderColor: 'var(--neon, #22c55e)', color: 'var(--neon, #22c55e)' },
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

  const fetchProfile = useCallback(async () => {
    if (!username) {return;}
    setLoading(true);
    const isMe = currentUser && (String(username) === String(currentUser.username) || String(username) === String(currentUser._id) || String(username) === String(currentUser.id));

        if (isMe) {
      setProfile({ ...currentUser, stats: currentUser.stats || { followersCount: 0, followingCount: 0, postsCount: 0 } });
      setLoading(false);
      return;
    }


    try {
      const { data } = await axios.get(`/api/users/${encodeURIComponent(username)}`);
        if (isMe) {
          setProfile({ ...data, ...currentUser, stats: data?.stats || currentUser.stats || { followersCount: 0, followingCount: 0, postsCount: 0 } });
        } else {
          setProfile(data);
        }
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
      if (!isMe) {setLoading(false);}
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
    if (!profile) return null;
    const p = { ...profile };
    const localPosts = storageCache.getPosts();
    const userPostsCount = localPosts.filter(post => 
      String(post.author?._id || post.author?.id || post.author?.username || post.author) === String(p._id || p.id || p.username)
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

  const fetchPosts = useCallback(
    async (page = 1, append = false) => {
      if (!userId) return;
      setLoading(true);
      let fetchedPosts = [];
      try {
        const res = await fetchUserPosts(userId, { page, limit });
        fetchedPosts = res?.posts || (Array.isArray(res) ? res : []);
      } catch (err) {
        console.warn('API fetch failed, using local cache', err);
      } finally {
        const localPosts = storageCache.getPosts();
        const userPosts = localPosts.filter(p => 
          String(p.author?._id || p.author?.id || p.author?.username || p.author) === String(userId)
        );
        
        const allPosts = [...fetchedPosts, ...userPosts];
        const unique = Array.from(new Map(allPosts.map(p => [p._id, p])).values());
        unique.sort((a,b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        
        const paginated = unique.slice((page - 1) * limit, page * limit);
        
        setPosts(prev => append ? [...prev, ...paginated] : paginated);
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
    return v ?? initialFollowing;
  });
  const [loading, setLoading] = useState(false);
  const { user } = useContext(AuthContext);
  const notify = useNotification();

  useEffect(() => {
    const localFollows = storageCache.getFollows();
    const v = localFollows?.[targetUserId];
    if (v === undefined) {
      setFollowing(initialFollowing);
    }
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
        await axios.post(`/api/users/${encodeURIComponent(targetUserId)}/follow`);
      } else {
        await axios.delete(`/api/users/${encodeURIComponent(targetUserId)}/follow`);
      }
      if (onUpdate) {onUpdate(!prev);}
    } catch (err) {
      // Fallback local persistence
      
      if (!prev && targetUserId !== String(user?._id || user?.id)) {
        storageCache.addNotification({
          _id: `notif_follow_${Date.now()}`,
          type: 'follow',
          actor: user || { username: 'User' },
          text: 'started following you',
          targetId: targetUserId,
          read: false,
          createdAt: new Date().toISOString()
        });
        window.dispatchEvent(new Event('local_notify'));
      }

      if (onUpdate) {onUpdate(!prev);}
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

const StatsBar = React.memo(({ stats }) => (
  <motion.div
    variants={pageContainer}
    initial="hidden"
    animate="visible"
    className="flex flex-wrap justify-center md:justify-start gap-6 md:gap-8 mt-2 text-sm md:text-base"
  >
    {[
      { label: 'Followers', value: stats?.followersCount ?? 0 },
      { label: 'Following', value: stats?.followingCount ?? 0 },
      { label: 'Posts', value: stats?.postsCount ?? 0 },
    ].map(({ label, value }) => (
      <motion.div key={label} variants={statVariant} className="text-center">
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

const FollowButton = React.memo(({ profile, isOwnProfile }) => {
  const { user } = useContext(AuthContext);
  const [followingCount, setFollowingCount] = useState(profile?.stats?.followersCount || 0);
  const { following, loading, toggle } = useFollowToggle(
    profile?.isFollowing || false,
    profile?._id,
    (newState) => setFollowingCount((prev) => prev + (newState ? 1 : -1))
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
          ? 'bg-neon/10 border-neon/40 text-neon hover:bg-neon/20'
          : 'bg-neon text-black border-neon hover:bg-neon/90'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {loading ? (
        <Loader className="w-4 h-4 animate-spin" />
      ) : following ? (
        <UserCheck className="w-4 h-4" />
      ) : (
        <UserPlus className="w-4 h-4" />
      )}
      {following ? 'Following' : 'Follow'}
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
              ? 'text-neon border-b-2 border-neon'
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
              currentUserId={userId}
              onDelete={deleteTalk}
            />
          </motion.div>
        ))
      )}

      {loading && posts.length > 0 && (
        <div className="flex justify-center py-4">
          <div className="w-6 h-6 border-2 border-white/10 border-t-neon rounded-full animate-spin" />
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
  const isOwnProfile = currentUser && (currentUser.username === targetUsername || currentUser._id === targetUsername || currentUser.id === targetUsername);
  const { score, rank } = useCredibility(targetUsername);
  const notify = useNotification();


  const [activeTab, setActiveTab] = useState('posts');

  // If no username and no current user, redirect to login
  useEffect(() => {
    if (!targetUsername && !currentUser) {
      navigate('/auth');
    }
  }, [targetUsername, currentUser, navigate]);

  // Show skeleton while loading
  if (profileLoading) {return <ProfileSkeleton />;}

  // Error state
  if (error) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <ShieldCheck className="w-16 h-16 text-red-400 mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">User not found</h2>
          <p className="text-gray-400 text-sm mb-4">This account doesn’t exist or may have been removed.</p>
          <button
            onClick={() => navigate(-1)}
            className="text-neon hover:underline text-sm font-medium"
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
        <ProfileCover profile={profile} />

        {/* Profile Header */}
        <motion.div
          variants={headerVariant}
          className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-6"
        >
          {/* Left: Avatar + mobile stats */}
          <div className="flex flex-col items-center md:items-start">
            <ProfileAvatar profile={profile} />
            <StatsBar stats={profile?.stats} />
          </div>

          {/* Right: Info & actions */}
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row items-center md:items-start md:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 justify-center md:justify-start">
                  <h1 className="text-2xl md:text-3xl font-bold text-white">
                    {profile?.displayName || profile?.username}
                  </h1>
                  {profile?.verified && (
                    <span className="text-neon" title="Verified">
                      <ShieldCheck className="w-5 h-5" />
                    </span>
                  )}
                </div>
                <p className="text-gray-400 text-sm md:text-base">
                  @{profile?.username}
                  <span className={`ml-2 text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border ${rank.bg} ${rank.color} ${rank.border}`}>
                    {rank.title}
                  </span>
                </p>
                {profile?.bio && (
                  <p className="mt-2 text-gray-300 text-sm max-w-md">{profile.bio}</p>
                )}
                <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-gray-500 justify-center md:justify-start">
                  {profile?.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {profile.location}
                    </span>
                  )}
                  {profile?.website && (
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-neon hover:underline"
                    >
                      <LinkIcon className="w-3 h-3" /> Website
                    </a>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Joined {new Date(profile?.createdAt).toLocaleDateString()}
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
                  <FollowButton profile={profile} isOwnProfile={isOwnProfile} />
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs & Feed */}
        <div className="mt-8">
          <ProfileTabs activeTab={activeTab} onChange={setActiveTab} />
          <UserFeed userId={profile?._id} activeTab={activeTab} />
        </div>
      </motion.div>
    </Layout>
  );
}