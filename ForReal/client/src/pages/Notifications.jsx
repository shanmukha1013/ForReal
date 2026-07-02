// -----------------------------------------------------------------------------
// Notifications Page – Realtime Social Activity Center
// -----------------------------------------------------------------------------
// Enterprise‑grade notification feed with grouping, filtering,
// realtime socket updates, swipe‑to‑dismiss (mobile), staggered animations,
// premium glassmorphism cards, and fully responsive layout.
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
import {
  BellIcon,
  HeartIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  TrophyIcon,
  SparklesIcon,
  CheckIcon,
  FunnelIcon,
  XMarkIcon,
  HandThumbDownIcon,
  Cog6ToothIcon,
  SparklesIcon as ZapIcon,
  ArrowPathIcon,
  ChevronRightIcon,
  AtSymbolIcon,
  MicrophoneIcon,
  ArrowTrendingUpIcon,
  ShieldCheckIcon,
  TrashIcon,
  FireIcon,
  HandThumbUpIcon,
  ShieldExclamationIcon,
  CheckBadgeIcon,
  NoSymbolIcon,
} from '@heroicons/react/24/outline';

// Backward-compatible icon aliases (removes lucide-react dependency)
const Bell = BellIcon;
const Heart = HeartIcon;
const MessageCircle = ChatBubbleLeftRightIcon;
const Dislike = HandThumbDownIcon;
const Users = UserGroupIcon;
const Award = TrophyIcon;
const Sparkles = SparklesIcon;
const CheckCheck = CheckIcon;
const Filter = FunnelIcon;
const X = XMarkIcon;
const Settings = Cog6ToothIcon;
const RefreshCw = ArrowPathIcon;
const AtSign = AtSymbolIcon;
const Mic = MicrophoneIcon;
const TrendingUp = ArrowTrendingUpIcon;
const Shield = ShieldCheckIcon;
const ChevronRight = ChevronRightIcon;
const Zap = ZapIcon;
const Trash = TrashIcon;
const Flame = FireIcon;
const ThumbsUp = HandThumbUpIcon;
const ShieldAlert = ShieldExclamationIcon;
const CheckBadge = CheckBadgeIcon;
const Ban = NoSymbolIcon;
import Layout from '../components/Layout';
import { AuthContext } from '../context/AuthContext';
import { useNotification } from '../components/Notification'; // for toast feedback
import { getSocket } from '../realtime/socket';
import axios from '../api/axios';
import { useNavigate } from 'react-router-dom';
import { storageCache } from '../lib/storageCache';

// -----------------------------------------------------------------------------
// Custom Hooks
// -----------------------------------------------------------------------------

/**
 * Fetch paginated notifications with optional filter.
 * Returns { notifications, loading, error, refetch, markAllRead, markOneRead }
 */
const useNotifications = (filter = 'all') => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(1);
  const abortRef = useRef(null);

  const fetchNotifications = useCallback(async (page = 1, append = false) => {
    if (abortRef.current) {abortRef.current.abort();}
    const controller = new AbortController();
    abortRef.current = controller;

    const isInitial = !append;
    if (isInitial) {setLoading(true);}

    let fetched = [];
    try {
      const { data } = await axios.get('/notifications', {
        params: { filter: filter === 'all' ? undefined : filter, page, limit: 20 },
        signal: controller.signal,
      });
      fetched = data.notifications || [];
      setError(null);
    } catch (err) {
      if (!axios.isCancel(err)) {
        // Fallback silently
      }
    } finally {
      const local = storageCache.getNotifications();
      const all = [...fetched, ...local];
      const unique = Array.from(new Map(all.map(n => [n._id, n])).values());
      
      let filtered = unique;
      if (filter !== 'all') {
        filtered = filtered.filter(n => n.type === filter);
      }
      filtered.sort((a,b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      
      const newNotifs = filtered.slice((page - 1) * 20, page * 20);
      setNotifications(prev => append ? [...prev, ...newNotifs] : newNotifs);
      setHasMore(page * 20 < filtered.length);
      pageRef.current = page;
      if (isInitial) {setLoading(false);}
    }
  }, [filter]);

  useEffect(() => {
    fetchNotifications(1);
    return () => {
      if (abortRef.current) {abortRef.current.abort();}
    };
  }, [fetchNotifications]);

  const loadMore = useCallback(() => {
    if (!hasMore) {return;}
    fetchNotifications(pageRef.current + 1, true);
  }, [fetchNotifications, hasMore]);

  // Realtime: listen for new notifications via socket
  useEffect(() => {
    const socket = getSocket();
    if (!socket) {return;}

    const onNewNotification = (newNotif) => {
      // Only append if filter matches (or if filter is 'all')
      if (filter === 'all' || newNotif.type === filter) {
        setNotifications(prev => [newNotif, ...prev]);
      }
    };

    socket.on('notification:new', onNewNotification);
    return () => socket.off('notification:new', onNewNotification);
  }, [filter]);

  const markOneRead = useCallback(async (notifId) => {
    try {
      await axios.post(`/notifications/${notifId}/read`);
    } catch {
      // silent fail
    } finally {
      const local = storageCache.getNotifications();
      const updated = local.map(n => n._id === notifId ? { ...n, read: true } : n);
      storageCache.setNotifications(updated);
      setNotifications(prev => prev.map(n => (n._id === notifId ? { ...n, read: true } : n)));
      window.dispatchEvent(new Event('local_notify'));
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await axios.post('/notifications/mark-all-read');
    } catch {
      // silent
    } finally {
      const local = storageCache.getNotifications();
      const updated = local.map(n => ({ ...n, read: true }));
      storageCache.setNotifications(updated);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      window.dispatchEvent(new Event('local_notify'));
    }
  }, []);

  const deleteNotifications = useCallback(async (notifIds) => {
    const ids = Array.isArray(notifIds) ? notifIds : [notifIds];
    try {
      await Promise.all(ids.map(id => axios.delete(`/notifications/${id}`).catch(()=>{})));
    } catch {
      // silent fail
    } finally {
      const local = storageCache.getNotifications();
      const idSet = new Set(ids);
      const updated = local.filter(n => !idSet.has(n._id));
      storageCache.setNotifications(updated);
      setNotifications(prev => prev.filter(n => !idSet.has(n._id)));
      window.dispatchEvent(new Event('local_notify'));
    }
  }, []);

  const clearAllNotifications = useCallback(async () => {
    try {
      await axios.delete('/notifications/clear-all');
    } catch {
      // silent
    } finally {
      storageCache.setNotifications([]);
      setNotifications([]);
      window.dispatchEvent(new Event('local_notify'));
    }
  }, []);

  return {
    notifications,
    loading,
    error,
    hasMore,
    loadMore,
    refetch: () => fetchNotifications(1),
    markOneRead,
    markAllRead,
    deleteNotifications,
    clearAllNotifications,
  };
};

// -----------------------------------------------------------------------------
// Animation Variants
// -----------------------------------------------------------------------------
const containerStagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.04, delayChildren: 0.1 },
  },
};

const itemVariant = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
  exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
};

const skeletonPulse = {
  animate: { opacity: [0.4, 0.8, 0.4], transition: { repeat: Infinity, duration: 1.8 } },
};

// -----------------------------------------------------------------------------
// Subcomponents
// -----------------------------------------------------------------------------

// Notification icon resolver (reusable)
const IconResolver = ({ type, text }) => {
  const getIcon = () => {
    if (type === 'like') {return Heart;}
    if (type === 'dislike') {return Dislike;}
    if (type === 'agree') {return ThumbsUp;}
    if (type === 'disagree') {return Dislike;}
    if (type === 'facts') {return CheckBadge;}
    if (type === 'cap') {return Ban;}
    if (type === 'misleading' || type === 'fact-check') {return ShieldAlert;}
    if (type === 'validPoint' || type === 'credibility') {return Award;}
    if (type === 'heat' || type === 'trending') {return Flame;}
    if (type === 'comment' || type === 'reply') {return MessageCircle;}
    if (type === 'follow') {return Users;}
    if (type === 'mention') {return AtSign;}
    if (type === 'debate' || type === 'room_invite') {return Mic;}
    if (type === 'system') {return Shield;}
    // fallback based on text
    const lower = text?.toLowerCase() || '';
    if (lower.includes('dislike')) {return Dislike;}
    if (lower.includes('agree')) {return ThumbsUp;}
    if (lower.includes('facts')) {return CheckBadge;}
    if (lower.includes('cap')) {return Ban;}
    if (lower.includes('misleading')) {return ShieldAlert;}
    if (lower.includes('valid point')) {return Award;}
    if (lower.includes('heat') || lower.includes('explosive')) {return Flame;}
    if (lower.includes('like')) {return Heart;}
    if (lower.includes('comment') || lower.includes('reply')) {return MessageCircle;}
    if (lower.includes('follow')) {return Users;}
    if (lower.includes('mention')) {return AtSign;}
    if (lower.includes('debate')) {return Mic;}
    return Sparkles;
  };
  const Icon = getIcon();
  return Icon;
};

// Group of similar notifications (e.g., "User and 5 others liked your talk")
const NotificationGroup = React.memo(({ group, index, onMarkOneRead, onDelete }) => {
  const { actor, action, target, count, notifications: groupItems, read } = group;
  const isNew = !read;
  const Icon = IconResolver({ type: groupItems[0]?.type, text: groupItems[0]?.text });
  const navigate = useNavigate();

  const handleClick = useCallback(() => {
    // Mark the whole group as read
    groupItems.forEach(n => {
      if (!n.read) {onMarkOneRead(n._id);}
    });
    const first = groupItems[0];
    if (first.type === 'follow' && actor?._id) {navigate(`/profile/${actor._id}`);}
    else if (first.type === 'debate' || first.type === 'room_invite') {navigate(`/rooms/${first.targetId}`);}
    else if (first.type === 'mention') {navigate(`/messages`);}
    else if (first.targetId) {navigate(`/home`);}
  }, [groupItems, onMarkOneRead]);

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(groupItems.map(n => n._id));
  };

  return (
    <motion.div
      variants={itemVariant}
      whileHover={{ x: 4 }}
      onClick={handleClick}
      className={`group relative overflow-hidden bg-black/40 backdrop-blur-sm rounded-xl border transition-all duration-300 cursor-pointer ${
        isNew ? 'border-brand/30 shadow-glow-sm bg-brand/5' : 'border-white/10 hover:border-white/20'
      }`}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-neon/0 via-neon/5 to-neon/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <div className="relative p-4 flex items-start gap-3 pr-4">
        {/* Avatar / Icon */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
          isNew ? 'bg-brand/20 border border-brand/30' : 'bg-white/10 border border-white/10'
        }`}>
          {actor?.avatar ? (
            <img src={actor.avatar} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            <Icon className={`w-5 h-5 ${isNew ? 'text-brand' : 'text-gray-400'}`} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-sm text-gray-200 leading-relaxed">
            <span className="font-bold text-brand">{actor?.displayName || actor?.username || 'Someone'}</span>
            {count > 1 && (
              <>
                {' '} and <span className="font-semibold text-gray-300">{count - 1} other{count > 2 ? 's' : ''}</span>
              </>
            )}
            {' '}
            <span className="text-gray-300">{action}</span>
            {target && (
              <>
                {' on '}
                <span className="text-brand font-medium truncate">"{target}"</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs text-gray-500">
              {new Date(groupItems[0]?.createdAt).toLocaleString()}
            </span>
            {isNew && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand/20 text-brand font-mono">
                NEW
              </span>
            )}
          </div>
        </div>

        {/* Actions & Indicator */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0 mt-1">
          {!read && <div className="w-2 h-2 rounded-full bg-brand shadow-glow-sm" />}
          <button
            onClick={handleDelete}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-all focus:opacity-100 outline-none"
            title="Delete notification"
          >
            <Trash className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
});
NotificationGroup.displayName = 'NotificationGroup';

// Single notification item (not grouped)
const NotificationItem = React.memo(({ notification, index, onMarkOneRead, onDelete }) => {
  const isNew = !notification.read;
  const Icon = IconResolver({ type: notification.type, text: notification.text });
  const navigate = useNavigate();

  const handleClick = () => {
    if (!notification.read) {onMarkOneRead(notification._id);}
    
    if (notification.type === 'follow' && notification.actor?._id) {navigate(`/profile/${notification.actor._id}`);}
    else if (notification.type === 'debate' || notification.type === 'room_invite') {navigate(`/rooms/${notification.targetId}`);}
    else if (notification.type === 'mention') {navigate(`/messages`);}
    else if (notification.targetId) {navigate(`/home`);}
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(notification._id);
  };

  return (
    <motion.div
      variants={itemVariant}
      whileHover={{ x: 4 }}
      onClick={handleClick}
      className={`group relative overflow-hidden bg-black/40 backdrop-blur-sm rounded-xl border transition-all duration-300 cursor-pointer ${
        isNew ? 'border-brand/30 shadow-glow-sm bg-brand/5' : 'border-white/10 hover:border-white/20'
      }`}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-neon/0 via-neon/5 to-neon/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <div className="relative p-4 flex items-start gap-3 pr-4">
        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
          isNew ? 'bg-brand/20 border border-brand/30' : 'bg-white/10 border border-white/10'
        }`}>
          {notification.actor?.avatar ? (
            <img src={notification.actor.avatar} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            <Icon className={`w-5 h-5 ${isNew ? 'text-brand' : 'text-gray-400'}`} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-sm text-gray-200 leading-relaxed">
            <span className="font-bold text-brand">
              {notification.actor?.displayName || notification.actor?.username || 'Someone'}
            </span>
            {' '}
            <span className="text-gray-300">{notification.text}</span>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs text-gray-500">
              {new Date(notification.createdAt).toLocaleString()}
            </span>
            {isNew && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand/20 text-brand font-mono">
                NEW
              </span>
            )}
          </div>
        </div>

        {/* Actions & Indicator */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0 mt-1">
          {!notification.read && <div className="w-2 h-2 rounded-full bg-brand shadow-glow-sm" />}
          <button
            onClick={handleDelete}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-all focus:opacity-100 outline-none"
            title="Delete notification"
          >
            <Trash className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
});
NotificationItem.displayName = 'NotificationItem';

// Skeleton loader
const NotificationSkeleton = React.memo(() => (
  <motion.div variants={skeletonPulse} animate="animate" className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 p-4">
    <div className="flex gap-3">
      <div className="w-10 h-10 rounded-full bg-white/5" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-white/5 rounded w-3/4" />
        <div className="h-3 bg-white/5 rounded w-1/2" />
      </div>
    </div>
  </motion.div>
));
NotificationSkeleton.displayName = 'NotificationSkeleton';

// Filter tabs
const FilterTabs = React.memo(({ activeFilter, onChange, unreadCount }) => {
  const filters = [
    { key: 'all', label: 'All' },
    { key: 'mention', label: 'Mentions' },
    { key: 'debate', label: 'Debates' },
    { key: 'like', label: 'Likes' },
    { key: 'comment', label: 'Comments' },
    { key: 'follow', label: 'Follows' },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
      {filters.map(({ key, label }) => (
        <motion.button
          key={key}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onChange(key)}
          className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${
            activeFilter === key
              ? 'bg-brand/10 border-brand/30 text-brand shadow-glow-sm'
              : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20 hover:text-brand'
          }`}
        >
          {label}
          {key === 'all' && unreadCount > 0 && (
            <span className="ml-1.5 bg-brand text-white text-[10px] px-1.5 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </motion.button>
      ))}
    </div>
  );
});
FilterTabs.displayName = 'FilterTabs';

// Empty state
const EmptyState = React.memo(() => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="text-center py-16 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10"
  >
    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
      <Bell className="w-10 h-10 text-gray-500" />
    </div>
    <h3 className="text-xl font-semibold text-brand mb-1">All caught up</h3>
    <p className="text-gray-400 text-sm">When people interact with your content, you'll see it here.</p>
  </motion.div>
));
EmptyState.displayName = 'EmptyState';

// -----------------------------------------------------------------------------
// Main Notifications Component
// -----------------------------------------------------------------------------
export default function Notifications() {
  const { user } = useContext(AuthContext);
  const toast = useNotification();
  const [filter, setFilter] = useState('all');
  const [markingAll, setMarkingAll] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);

  const {
    notifications,
    loading,
    error,
    hasMore,
    loadMore,
    refetch,
    markOneRead,
    markAllRead,
    deleteNotifications,
    clearAllNotifications,
  } = useNotifications(filter);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  // Group notifications: here we group by targetId if multiple from same actor with same action within 1 hour;
  // For simplicity, we'll group by same actor + action + target (if present) stacking into a count.
  // We'll create a derived "groupedNotifications" array.
  const groupedNotifications = useMemo(() => {
    const groupMap = new Map();
    notifications.forEach((notif) => {
      const key = `${notif.actor?._id || notif.actor}_${notif.type}_${notif.targetId || 'none'}_${notif.action || notif.text}`;
      const group = groupMap.get(key);
      if (group) {
        group.count += 1;
        group.notifications.push(notif);
        // keep earliest unread status? if any unread => group.unread = false? let's set unread false only if all read
        group.read = group.read && notif.read;
        // Use most recent timestamp? we keep the newest
        if (new Date(notif.createdAt) > new Date(group.mostRecent)) {
          group.mostRecent = notif.createdAt;
          group.actor = notif.actor; // latest actor
        }
      } else {
        groupMap.set(key, {
          key,
          count: 1,
          actor: notif.actor,
          action: notif.action || (notif.text ? notif.text.split(' ').slice(1).join(' ') : notif.text || 'interacted'),
          target: notif.targetId ? (notif.targetText || 'item') : undefined,
          notifications: [notif],
          read: notif.read,
          mostRecent: notif.createdAt,
        });
      }
    });
    // Convert map to sorted array (newest first)
    return Array.from(groupMap.values()).sort(
      (a, b) => new Date(b.mostRecent) - new Date(a.mostRecent)
    );
  }, [notifications]);

  const handleMarkAll = async () => {
    setMarkingAll(true);
    await markAllRead();
    toast.success('Marked all as read');
    setMarkingAll(false);
  };

  const handleClearAll = async () => {
    setClearingAll(true);
    await clearAllNotifications();
    toast.success('All notifications cleared');
    setClearingAll(false);
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative"
        >
          <div className="absolute inset-x-0 -top-10 h-24 bg-brand/10 blur-3xl rounded-full pointer-events-none" />
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-brand/10 border border-brand/30">
                <Bell className="w-6 h-6 text-brand" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-brand">Notifications</h1>
                <p className="text-gray-400 text-xs sm:text-sm mt-0.5">
                  Stay updated on talks, debates, and connections
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={refetch}
                className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
              >
                <RefreshCw className="w-4 h-4 text-brand" />
              </motion.button>
              {unreadCount > 0 && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleMarkAll}
                  disabled={markingAll}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-medium text-gray-300 hover:border-brand/50 hover:text-brand transition disabled:opacity-50"
                >
                  <CheckCheck className="w-4 h-4" />
                  {markingAll ? 'Marking...' : 'Mark all read'}
                </motion.button>
              )}
              {groupedNotifications.length > 0 && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleClearAll}
                  disabled={clearingAll}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-medium text-gray-300 hover:border-red-400/50 hover:text-red-400 transition disabled:opacity-50"
                  title="Clear all notifications"
                >
                  <Trash className="w-4 h-4" />
                  <span className="hidden sm:inline">{clearingAll ? 'Clearing...' : 'Clear All'}</span>
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Filter Tabs */}
        <FilterTabs activeFilter={filter} onChange={setFilter} unreadCount={unreadCount} />

        {/* Content */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              variants={containerStagger}
              initial="hidden"
              animate="visible"
              className="space-y-3"
            >
              {[...Array(5)].map((_, i) => (
                <NotificationSkeleton key={i} />
              ))}
            </motion.div>
          ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 bg-black/40 backdrop-blur-xl rounded-2xl border border-red-500/30"
            >
              <p className="text-red-400">{error}</p>
              <button onClick={refetch} className="mt-3 text-brand text-sm underline">
                Retry
              </button>
            </motion.div>
          ) : groupedNotifications.length === 0 ? (
            <EmptyState key="empty" />
          ) : (
            <motion.div
              key="list"
              variants={containerStagger}
              initial="hidden"
              animate="visible"
              className="space-y-2.5"
            >
              <AnimatePresence>
                {groupedNotifications.map((group) =>
                  group.count > 1 ? (
                    <NotificationGroup
                      key={group.key}
                      group={group}
                      onMarkOneRead={markOneRead}
                      onDelete={deleteNotifications}
                    />
                  ) : (
                    <NotificationItem
                      key={group.notifications[0]._id}
                      notification={group.notifications[0]}
                      onMarkOneRead={markOneRead}
                      onDelete={deleteNotifications}
                    />
                  )
                )}
              </AnimatePresence>
              {hasMore && (
                <div className="flex justify-center py-4">
                  <button
                    onClick={loadMore}
                    className="text-brand text-sm hover:underline flex items-center gap-1"
                  >
                    Load more <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}