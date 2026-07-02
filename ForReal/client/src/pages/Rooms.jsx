// -----------------------------------------------------------------------------
// Rooms Page – Live Debate Discovery Hub
// -----------------------------------------------------------------------------
// Enterprise‑grade real‑time room discovery with category filters,
// trending sorting, live pulse indicators, premium glassmorphism cards,
// staggered animations, and a seamless create‑room flow.
// -----------------------------------------------------------------------------

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useContext,
  useMemo,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  PlusIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  UsersIcon,
  EyeIcon,
  GlobeAmericasIcon,
  LockClosedIcon,
  FireIcon,
  ChatBubbleBottomCenterTextIcon,
  AdjustmentsHorizontalIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckIcon,
  ArrowRightIcon,
  HashtagIcon,
  BoltIcon,
  ChartBarIcon,
  FunnelIcon,
  EyeSlashIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';

import Layout from '../components/Layout';
import CreateDebateForm from '../components/CreateDebateForm';
import { AuthContext } from '../context/AuthContext';
import { useNotification } from '../components/Notification'; // adjust path
import axios from '../api/axios';
import { useDebateEnergy } from '../hooks/useDebateEnergy';
import { useGlobalRooms } from '../hooks/useGlobalRooms';
import { getSocket } from '../realtime/socket';
import { storageCache } from '../lib/storageCache';

// -----------------------------------------------------------------------------
// Backward-compatible icon aliases (removes lucide-react dependency)
// -----------------------------------------------------------------------------
const Plus = PlusIcon;
const RefreshCw = ArrowPathIcon;
const Search = MagnifyingGlassIcon;
const X = XMarkIcon;
const Users = UsersIcon;
const Eye = EyeIcon;
const Globe = GlobeAmericasIcon;
const Lock = LockClosedIcon;
const Flame = FireIcon;
const MessageCircle = ChatBubbleBottomCenterTextIcon;
const SlidersHorizontal = AdjustmentsHorizontalIcon;
const TrendingUp = ArrowTrendingUpIcon;
const Clock = ClockIcon;
const AlertTriangle = ExclamationTriangleIcon;
const Check = CheckIcon;
const ArrowRight = ArrowRightIcon;
const Hash = HashtagIcon;
const Zap = BoltIcon;
const Activity = ChartBarIcon;
const Filter = FunnelIcon;
const ChevronDown = ChevronDownIcon;
const EyeSlash = EyeSlashIcon;

// -----------------------------------------------------------------------------
// Custom Hooks
// -----------------------------------------------------------------------------

/**
 * Fetch rooms with optional filters and sorting.
 * Returns { rooms, loading, error, refetch }
 */
function useRooms(filters = {}) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const fetchRooms = useCallback(async () => {
    if (abortRef.current) {abortRef.current.abort();}
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    let fetchedRooms = [];
    try {
      const payload = await axios.get('/rooms', {
        params: {
          sort: filters.sort || 'trending',
          category: filters.category || undefined,
          search: filters.search || undefined,
        },
        signal: controller.signal,
      });
      fetchedRooms = payload.rooms || [];
      setError(null);
    } catch (err) {
      if (!axios.isCancel(err)) {
        // Silent fallback to local storage
        setError(null);
      }
    } finally {
      const localRooms = storageCache.getRooms();
      const allRooms = [...localRooms, ...fetchedRooms];
      const uniqueRooms = Array.from(new Map(allRooms.map(r => [r._id, r])).values());
      
      let filtered = uniqueRooms;
      if (filters.category && filters.category !== 'All') {
        filtered = filtered.filter(r => r.category === filters.category);
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        filtered = filtered.filter(r => 
          (r.topic && r.topic.toLowerCase().includes(q)) || 
          (r.description && r.description.toLowerCase().includes(q))
        );
      }
      if (filters.sort === 'newest') {
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }

      setRooms(filtered);
      setLoading(false);
    }
  }, [filters.sort, filters.category, filters.search]);

  useEffect(() => {
    fetchRooms();
    return () => {
      if (abortRef.current) {abortRef.current.abort();}
    };
  }, [fetchRooms]);

  return { rooms, loading, error, refetch: fetchRooms };
}

/**
 * Fetch available room categories (static or dynamic).
 */
function useCategories() {
  // Could be fetched from API, here static for speed
  const categories = useMemo(
    () => [
      'All',
      'Politics',
      'Technology',
      'Sports',
      'Entertainment',
      'Gaming',
      'Finance',
      'Science',
      'Music',
      'Health',
      'Education',
    ],
    []
  );
  return { categories };
}

// -----------------------------------------------------------------------------
// Animation Variants
// -----------------------------------------------------------------------------
const containerVariant = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
};

const cardVariant = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.35, ease: 'easeOut' },
  },
};

const skeletonPulse = {
  animate: { opacity: [0.3, 0.6, 0.3], transition: { repeat: Infinity, duration: 1.8 } },
};

const createPanelVariant = {
  hidden: { opacity: 0, height: 0 },
  visible: { opacity: 1, height: 'auto', transition: { duration: 0.3 } },
};

// -----------------------------------------------------------------------------
// Subcomponents
// -----------------------------------------------------------------------------

// Category filter pill
const CategoryPill = React.memo(({ category, active, onClick }) => (
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.97 }}
    onClick={() => onClick(category === 'All' ? '' : category)}
    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 whitespace-nowrap ${
      active
        ? 'bg-brand/15 border border-brand/40 text-brand shadow-glow-sm'
        : 'bg-white/5 border border-white/10 text-gray-400 hover:text-brand hover:border-white/20'
    }`}
  >
    {category === 'All' ? <Activity className="w-3.5 h-3.5" /> : <Hash className="w-3.5 h-3.5" />}
    {category}
  </motion.button>
));
CategoryPill.displayName = 'CategoryPill';

// Room Card (enterprise version)
const RoomCard = React.memo(({ room, index }) => {
  const {
    _id,
    topic,
    description,
    status,
    visibility,
    category,
    pro,
    against,
    observers,
    participants,
    createdAt,
    creator,
    createdBy,
    anonymityMode, // 'public', 'hybrid', 'anonymous'
    intensity, // e.g. 'hot', 'calm', 'moderate'
  } = room;

  const proCount = pro?.participants?.length || 0;
  const againstCount = against?.participants?.length || 0;
  const participantsCount = Array.isArray(participants) ? participants.length : (participants || 0);
  const totalSpectators = observers?.length || room.spectators || participantsCount || 0;
  const isLive = status === 'active';
  const roomCreator = creator || createdBy;

  const energy = useDebateEnergy(room);
  const IntensityIcon = energy.icon;

  return (
    <motion.div
      variants={cardVariant}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Link to={`/rooms/${_id}`} className="block h-full outline-none">
        <div className="group relative overflow-hidden rounded-2xl p-5 hover:border-brand/40 transition-all duration-300 h-full flex flex-col glass-card">
          {/* Glow overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-neon/0 via-neon/5 to-neon/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

          <div className="relative flex-1">
            {/* Status & Visibility badges */}
            <div className="flex items-center gap-2 mb-3">
              {isLive ? (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/30">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                  <span className="text-[10px] font-mono font-bold text-red-400">LIVE</span>
                </span>
              ) : (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-gray-400 border border-white/10">
                  {status?.toUpperCase() || 'PENDING'}
                </span>
              )}
              {visibility === 'private' ? (
                <Lock className="w-3.5 h-3.5 text-gray-400" />
              ) : (
                <Globe className="w-3.5 h-3.5 text-brand" />
              )}
              {category && (
                <span className="text-[10px] text-gray-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                  {category}
                </span>
              )}
              {anonymityMode === 'anonymous' && (
                <span className="text-[10px] text-brand bg-purple-400/10 px-2 py-0.5 rounded-full border border-purple-400/20 flex items-center gap-1">
                  <EyeSlash className="w-3 h-3" /> Anonymous
                </span>
              )}
              {anonymityMode === 'hybrid' && (
                <span className="text-[10px] text-brand bg-blue-400/10 px-2 py-0.5 rounded-full border border-blue-400/20 flex items-center gap-1">
                  <EyeSlash className="w-3 h-3" /> Hybrid
                </span>
              )}
            </div>

            {/* Topic */}
            <h3 className="text-brand font-bold text-base sm:text-lg mb-2 line-clamp-2 group-hover:text-brand transition-colors">
              {topic}
            </h3>
            {description && (
              <p className="text-gray-400 text-xs sm:text-sm line-clamp-2 mb-3">{description}</p>
            )}

            {/* Stats row */}
            <div className="mt-auto pt-3 border-t border-white/5 flex items-center gap-4 text-xs text-gray-400">
              <div className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-[#C1121F]" />
                <span className="font-medium text-brand">{proCount}</span> Pro
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-red-400" />
                <span className="font-medium text-brand">{againstCount}</span> Against
              </div>
              <div className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                <span>{totalSpectators}</span>
              </div>
            </div>

            {/* Intensity indicator + creator */}
            <div className="mt-3 flex items-center justify-between">
              <div className={`flex items-center gap-1.5 text-[10px] ${energy.color}`}>
                <IntensityIcon className={`w-3.5 h-3.5 ${energy.level === 'explosive' ? 'animate-pulse' : ''}`} />
                <span className="font-semibold uppercase tracking-wider">{energy.label}</span>
              </div>
          {roomCreator && (
            <div className="text-[10px] text-gray-500" title={`Created by ${roomCreator.displayName || roomCreator.username}`}>
              by <span className="text-gray-400">@{roomCreator.username || '...'}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
});
RoomCard.displayName = 'RoomCard';

// Skeleton for room card
const RoomCardSkeleton = React.memo(() => (
  <motion.div variants={cardVariant} className="rounded-2xl p-5 min-h-[200px] glass-panel">
    <motion.div variants={skeletonPulse} animate="animate" className="space-y-3">
      <div className="flex gap-2">
        <div className="h-5 w-12 bg-white/5 rounded-full" />
        <div className="h-5 w-10 bg-white/5 rounded-full" />
      </div>
      <div className="h-6 w-3/4 bg-white/5 rounded" />
      <div className="h-4 w-full bg-white/5 rounded" />
      <div className="h-4 w-2/3 bg-white/5 rounded" />
      <div className="flex gap-4 mt-4">
        <div className="h-3 w-12 bg-white/5 rounded" />
        <div className="h-3 w-12 bg-white/5 rounded" />
        <div className="h-3 w-10 bg-white/5 rounded" />
      </div>
    </motion.div>
  </motion.div>
));
RoomCardSkeleton.displayName = 'RoomCardSkeleton';

// Create Room Panel is now imported from ../components/CreateDebateForm

// -----------------------------------------------------------------------------
// Main Rooms Component
// -----------------------------------------------------------------------------
export default function Rooms() {
  const { user } = useContext(AuthContext);
  const notify = useNotification();

  // Filters & search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('trending');
  const [showCreatePanel, setShowCreatePanel] = useState(false);

  // Fetch rooms based on filters
  const filters = useMemo(
    () => ({
      category: selectedCategory,
      sort: sortBy,
      search: searchTerm.trim() || undefined,
    }),
    [selectedCategory, sortBy, searchTerm]
  );

  const { rooms, loading, error, refetch } = useRooms(filters);
  const { categories } = useCategories();
  const { optimisticCreateRoom, confirmRoom, deleteRoom } = useGlobalRooms();

  // Handlers
  const handleCategoryChange = useCallback((cat) => {
    setSelectedCategory(cat);
  }, []);

  const handleNewRoomCreated = useCallback(
    (newRoom) => {
      // Optimistic add to top
      refetch(); // or manually add, but we refetch to get correct stats
      setShowCreatePanel(false);
    },
    [refetch]
  );

  // Subscribe to realtime new-room events
  useEffect(() => {
    const sock = getSocket();
    if (!sock) {return;}

    const onRoomsNew = (room) => {
      try {
        // Insert into local storage cache for immediate UI availability
        storageCache.addRoom(room);
      } catch (e) {
        console.error('[Rooms] rooms:new handler error', e);
      }
      // Refresh from server to get canonical shape
      refetch();
    };

    sock.on('rooms:new', onRoomsNew);
    return () => {
      sock.off('rooms:new', onRoomsNew);
    };
  }, [refetch]);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-brand flex items-center gap-2">
              <Zap className="w-7 h-7 text-brand" />
              Debate Rooms
            </h1>
            <p className="text-gray-400 text-sm mt-1">Join live debates, or start your own.</p>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={refetch}
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4 text-brand" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowCreatePanel((prev) => !prev)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand text-white font-bold text-sm shadow-lg shadow-neon/20"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Create</span>
            </motion.button>
          </div>
        </motion.div>

        {/* Create panel (animated) */}
        <AnimatePresence>
          {showCreatePanel && (
            <CreateDebateForm
              onCreate={handleNewRoomCreated}
              optimisticCreateRoom={optimisticCreateRoom}
              confirmRoom={confirmRoom}
              deleteRoom={deleteRoom}
            />
          )}
        </AnimatePresence>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search debates..."
              className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-brand placeholder-gray-500 focus:outline-none focus:border-brand/50 transition text-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-brand"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400 flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Sort:
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-xl px-3 py-3 text-sm text-brand focus:outline-none focus:border-brand/50"
            >
              <option value="trending">Trending</option>
              <option value="newest">🕒 Newest</option>
              <option value="active">Most Active</option>
            </select>
          </div>
        </div>

        {/* Category pills */}
        <motion.div
          variants={containerVariant}
          initial="hidden"
          animate="visible"
          className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide"
        >
          {categories.map((cat) => (
            <CategoryPill
              key={cat}
              category={cat}
              active={cat === 'All' ? !selectedCategory : selectedCategory === cat}
              onClick={handleCategoryChange}
            />
          ))}
        </motion.div>

        {/* Rooms Grid */}
        {error && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center justify-between"
          >
            <span>{error}</span>
            <button onClick={refetch} className="underline text-brand ml-2">Retry</button>
          </motion.div>
        )}

        {loading ? (
          <motion.div
            variants={containerVariant}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {[...Array(6)].map((_, i) => (
              <RoomCardSkeleton key={i} />
            ))}
          </motion.div>
        ) : rooms.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 rounded-2xl glass-panel"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
              <MessageCircle className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="text-brand font-semibold text-lg">No rooms found</h3>
            <p className="text-gray-400 text-sm mt-1">
              {searchTerm
                ? 'Try adjusting your search or filters'
                : 'Be the first to start a debate!'}
            </p>
            {!searchTerm && !selectedCategory && (
              <button
                onClick={() => setShowCreatePanel(true)}
                className="mt-4 inline-flex items-center gap-2 text-brand font-medium text-sm hover:underline"
              >
                <Plus className="w-4 h-4" /> Create a Room
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div
            variants={containerVariant}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {rooms.map((room, idx) => (
              <RoomCard key={room._id} room={room} index={idx} />
            ))}
          </motion.div>
        )}
      </div>
    </Layout>
  );
}