// -----------------------------------------------------------------------------
// Admin Dashboard – Professional Moderation & Platform Management
// -----------------------------------------------------------------------------
// Enterprise‑grade admin panel with real‑time stats, report queues,
// user/content/room management, audit logs, and advanced filtering.
// Fully responsive, accessible, and animated with Framer Motion.
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
  ShieldCheckIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  CheckBadgeIcon,
  TrashIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChevronDownIcon,
  EyeIcon,
  NoSymbolIcon,
  ClockIcon,
  ArrowPathIcon,
  BoltIcon,
  SquaresPlusIcon,
  RectangleStackIcon,
  UserCircleIcon,
  ChatBubbleBottomCenterTextIcon,
  ComputerDesktopIcon,
  ClockIcon as HistoryIcon,
  Bars3BottomLeftIcon,
  ArrowTrendingUpIcon,
  ArrowDownTrayIcon,
  AdjustmentsHorizontalIcon,
  ArrowTopRightOnSquareIcon,
  EllipsisHorizontalIcon,
} from '@heroicons/react/24/outline';

import Layout from '../components/Layout'; // we should use Layout to keep Navbar
import { AuthContext } from '../context/AuthContext';
import { useNotification } from '../components/Notification';
import axios from '../api/axios';
import { getSocket } from '../realtime/socket'; // adjust path

// -----------------------------------------------------------------------------
// Backward-compatible icon aliases (removes lucide-react dependency)
// -----------------------------------------------------------------------------
const Shield = ShieldCheckIcon;
const Users = UserGroupIcon;
const MessageSquare = ChatBubbleLeftRightIcon;
const AlertTriangle = ExclamationTriangleIcon;
const Activity = ChartBarIcon;
const CheckCircle = CheckBadgeIcon;
const Trash2 = TrashIcon;
const XCircle = XMarkIcon;
const Search = MagnifyingGlassIcon;
const Filter = FunnelIcon;
const ChevronDown = ChevronDownIcon;
const Eye = EyeIcon;
const Ban = NoSymbolIcon;
const UserCheck = CheckBadgeIcon;
const Clock = ClockIcon;
const RefreshCw = ArrowPathIcon;
const Zap = BoltIcon;
const LayoutDashboard = SquaresPlusIcon;
const FileText = RectangleStackIcon;
const UserCog = UserCircleIcon;
const MessageCircle = ChatBubbleBottomCenterTextIcon;
const Monitor = ComputerDesktopIcon;
const History = HistoryIcon;
const BarChart3 = Bars3BottomLeftIcon;
const TrendingUp = ArrowTrendingUpIcon;
const Download = ArrowDownTrayIcon;
const SlidersHorizontal = AdjustmentsHorizontalIcon;
const ArrowUpRight = ArrowTopRightOnSquareIcon;
const MoreHorizontal = EllipsisHorizontalIcon;

// -----------------------------------------------------------------------------
// Animation Variants
// -----------------------------------------------------------------------------
const pageEnter = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
};

const cardVariant = {
  hidden: { opacity: 0, y: 15, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3 } },
};

const itemVariant = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.2 } },
};

const skeletonPulse = {
  animate: { opacity: [0.3, 0.6, 0.3], transition: { repeat: Infinity, duration: 1.8 } },
};

// -----------------------------------------------------------------------------
// Custom Hooks
// -----------------------------------------------------------------------------

/**
 * Fetch admin statistics and auto‑refresh every 30s.
 */
const useAdminStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const notify = useNotification();

  const fetchStats = useCallback(async () => {
    try {
      const data = await axios.get('/admin/stats');
      setStats(data);
    } catch (err) {
      notify.error('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  return { stats, loading, refetch: fetchStats };
};

/**
 * Fetch moderation reports (paginated).
 */
const useReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const abortRef = useRef(null);

  const fetchReports = useCallback(async (pageNum = 1, append = false) => {
    if (abortRef.current) {abortRef.current.abort();}
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const data = await axios.get('/admin/reports', {
        params: { page: pageNum, limit: 10 },
        signal: controller.signal,
      });
      const newReports = data.reports || [];
      if (append) {
        setReports(prev => [...prev, ...newReports]);
      } else {
        setReports(newReports);
      }
      setHasMore(pageNum * 10 < (data.total || 0));
      setPage(pageNum);
    } catch (err) {
      if (!axios.isCancel(err)) {console.error(err);}
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports(1);
    return () => abortRef.current?.abort();
  }, [fetchReports]);

  const loadMore = () => {
    if (hasMore) {fetchReports(page + 1, true);}
  };

  return { reports, loading, hasMore, loadMore, refetch: () => fetchReports(1) };
};

/**
 * Fetch users list (paginated, searchable).
 */
const useUsers = (search = '') => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef(null);

  const fetchUsers = useCallback(async () => {
    if (abortRef.current) {abortRef.current.abort();}
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const data = await axios.get('/admin/users', {
        params: { search: search || undefined, limit: 50 },
        signal: controller.signal,
      });
      setUsers(data.users || []);
    } catch (err) {
      if (!axios.isCancel(err)) {console.error(err);}
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchUsers();

    return () => abortRef.current?.abort();
  }, [fetchUsers]);

  return { users, loading, refetch: fetchUsers };
};

/**
 * Fetch recent audit logs.
 */
const useAuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await axios.get('/admin/audit-logs', { params: { limit: 30 } });
        setLogs(data.logs || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return { logs, loading };
};

/**
 * Fetch active rooms.
 */
const useRooms = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRooms = useCallback(async () => {
    try {
      const data = await axios.get('/admin/rooms', { params: { status: 'all' } });
      setRooms(data.rooms || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  return { rooms, loading, refetch: fetchRooms };
};

// -----------------------------------------------------------------------------
// Subcomponents
// -----------------------------------------------------------------------------

// Stat Card
const StatColorClasses = {
  // safe fixed strings so Tailwind can generate them
  'neon':  { bg: 'bg-neon/10', border: 'border-neon/30', text: 'text-neon' },
  'red-400': { bg: 'bg-red-400/10', border: 'border-red-400/30', text: 'text-red-400' },
  'green-400': { bg: 'bg-green-400/10', border: 'border-green-400/30', text: 'text-green-400' },
};

const StatCard = React.memo(({ icon: Icon, label, value, sub, color }) => {
  const safe = StatColorClasses[color] || StatColorClasses.neon;

  return (
    <motion.div
      variants={cardVariant}
      className="relative overflow-hidden bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 p-5 hover:border-neon/40 transition-all duration-300 group"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-neon/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl ${safe.bg} border ${safe.border}`}>
          <Icon className={`w-6 h-6 ${safe.text}`} />
        </div>
        <div>
          <p className="text-gray-400 text-sm font-medium">{label}</p>
          <p className={`text-2xl font-bold ${safe.text} mt-1`}>{value}</p>
          {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
        </div>
      </div>
    </motion.div>
  );
});
StatCard.displayName = 'StatCard';

// Tab Bar
const AdminTabs = React.memo(({ tabs, active, onChange }) => (
  <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide">
    {tabs.map(({ key, label, icon: Icon }) => (
      <motion.button
        key={key}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => onChange(key)}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all border ${
          active === key
            ? 'bg-neon/10 border-neon/30 text-neon shadow-glow-sm'
            : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
        }`}
      >
        <Icon className="w-4 h-4" />
        {label}
      </motion.button>
    ))}
  </div>
));
AdminTabs.displayName = 'AdminTabs';

// Report Item
const ReportItem = React.memo(({ report, onResolve, onDismiss, onDeleteUser }) => {
  const [loading, setLoading] = useState(false);
  const handleAction = async (action, ...args) => {
    setLoading(true);
    try {
      await action(...args);
    } catch {
      // error handling in parent
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div variants={itemVariant} className="border-b border-white/5 p-4 hover:bg-white/5 transition-colors">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <span className={`text-xs font-mono px-2 py-1 rounded-full border ${
              report.status === 'pending'
                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                : 'bg-green-500/10 border-green-500/30 text-green-400'
            }`}>
              {report.status.toUpperCase()}
            </span>
            <span className="text-sm text-gray-300">
              {report.targetType === 'post' ? '📝 Talk' : '👤 User'}
            </span>
            <span className="text-xs text-gray-500">ID: {report._id}</span>
          </div>
          <p className="text-gray-300 text-sm">
            <span className="text-neon">Reason:</span> {report.reason}
          </p>
          <p className="text-gray-500 text-xs mt-1">
            Reported by: {report.reportedBy?.username || 'Anonymous'}
          </p>
        </div>
        {report.status === 'pending' && (
          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleAction(onResolve, report._id, 'resolved')}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 text-sm font-medium disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" /> Resolve
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleAction(onDeleteUser, report.targetId)}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-sm font-medium disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleAction(onDismiss, report._id)}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-500/10 border border-gray-500/30 text-gray-400 hover:bg-gray-500/20 text-sm font-medium disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" /> Dismiss
            </motion.button>
          </div>
        )}
      </div>
    </motion.div>
  );
});
ReportItem.displayName = 'ReportItem';

// User Row
const UserRow = React.memo(({ user, onAction }) => (
  <motion.div variants={itemVariant} className="border-b border-white/5 p-4 hover:bg-white/5 transition-colors flex items-center justify-between gap-4">
    <div className="flex items-center gap-3">
      <img
        src={user.avatar || `https://ui-avatars.com/api/?name=${user.username}&background=0F0F0F&color=22c55e`}
        alt=""
        className="w-10 h-10 rounded-full border border-white/20"
      />
      <div>
        <p className="text-white text-sm font-medium">{user.displayName || user.username}</p>
        <p className="text-gray-400 text-xs">@{user.username}</p>
        <p className="text-[10px] text-gray-500">Joined {new Date(user.createdAt).toLocaleDateString()}</p>
      </div>
    </div>
    <div className="flex gap-2">
      <button
        onClick={() => onAction('suspend', user._id)}
        className="text-xs text-yellow-400 hover:bg-yellow-400/10 px-3 py-1 rounded-lg border border-yellow-400/20"
      >
        Suspend
      </button>
      <button
        onClick={() => onAction('ban', user._id)}
        className="text-xs text-red-400 hover:bg-red-400/10 px-3 py-1 rounded-lg border border-red-400/20"
      >
        Ban
      </button>
      <button
        onClick={() => onAction('delete', user._id)}
        className="text-xs text-red-300 hover:bg-red-400/10 px-3 py-1 rounded-lg border border-red-400/20"
      >
        Delete
      </button>
      <button
        onClick={() => onAction('view', user._id)}
        className="text-xs text-neon hover:bg-neon/10 px-3 py-1 rounded-lg border border-neon/20"
      >
        View
      </button>
    </div>
  </motion.div>
));
UserRow.displayName = 'UserRow';

// Audit log entry
const LogEntry = React.memo(({ log }) => (
  <motion.div variants={itemVariant} className="flex items-start gap-3 p-3 hover:bg-white/5 rounded-lg transition-colors text-sm">
    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
      <Activity className="w-4 h-4 text-neon" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-gray-200">{log.action}</p>
      <p className="text-gray-500 text-xs mt-0.5">
        by {log.admin?.username || 'System'} · {new Date(log.timestamp).toLocaleString()}
      </p>
    </div>
  </motion.div>
));
LogEntry.displayName = 'LogEntry';

// Skeleton for sections
const SectionSkeleton = () => (
  <motion.div variants={skeletonPulse} animate="animate" className="space-y-3 p-4">
    <div className="h-6 bg-white/5 rounded w-1/3" />
    <div className="h-4 bg-white/5 rounded w-full" />
    <div className="h-4 bg-white/5 rounded w-2/3" />
  </motion.div>
);

// -----------------------------------------------------------------------------
// Main Admin Component
// -----------------------------------------------------------------------------
export default function Admin() {
  const { user } = useContext(AuthContext);
  const notify = useNotification();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Data hooks
  const { stats, loading: statsLoading, refetch: refetchStats } = useAdminStats();
  const { reports, loading: reportsLoading, hasMore, loadMore: loadMoreReports, refetch: refetchReports } = useReports();
  const [userSearch, setUserSearch] = useState('');
  const { users, loading: usersLoading, refetch: refetchUsers } = useUsers(userSearch);
  const { logs, loading: logsLoading } = useAuditLogs();
  const { rooms, loading: roomsLoading, refetch: refetchRooms } = useRooms();

  // Access control – only admin
  const isAdmin = user?.role === 'admin';

  // Realtime socket for report updates
  useEffect(() => {
    if (!isAdmin) {return;}
    const socket = getSocket();
    socket.on('admin:newReport', () => refetchReports());
    socket.on('admin:statsUpdate', () => refetchStats());
    return () => {
      socket.off('admin:newReport');
      socket.off('admin:statsUpdate');
    };
  }, [isAdmin, refetchReports, refetchStats]);

  // Actions
  const handleResolveReport = useCallback(async (reportId, status) => {
    try {
      await axios.put(`/admin/reports/${reportId}`, { status });
      notify.success(`Report ${status}`);
      refetchReports();
    } catch (err) {
      notify.error('Failed to update report');
    }
  }, [notify, refetchReports]);

  const handleDismissReport = useCallback(async (reportId) => {
    try {
      await axios.put(`/admin/reports/${reportId}`, { status: 'dismissed' });
      notify.success('Report dismissed');
      refetchReports();
    } catch (err) {
      notify.error('Failed to dismiss report');
    }
  }, [notify, refetchReports]);

  const handleDeleteUser = useCallback(async (userId) => {
    if (!window.confirm('Permanently delete this user? This action cannot be undone.')) {return;}
    try {
      await axios.delete(`/admin/users/${userId}`);
      notify.success('User deleted');
      refetchReports();
      refetchUsers();
    } catch (err) {
      notify.error('Failed to delete user');
    }
  }, [notify, refetchReports, refetchUsers]);

  const handleUserAction = async (action, userId) => {
    if (action === 'view') {
      window.location.href = `/profile/${userId}`;
      return;
    }
    if (action === 'delete') {
      await handleDeleteUser(userId);
      return;
    }
    notify.info(`${action} is not enabled yet`);
  };

  const handleEndRoom = useCallback(async (roomId) => {
    try {
      await axios.patch(`/admin/rooms/${roomId}/end`);
      notify.success('Debate ended');
      refetchRooms();
      refetchStats();
    } catch (err) {
      notify.error('Failed to end debate');
    }
  }, [notify, refetchRooms, refetchStats]);

  const handleDeleteRoom = useCallback(async (roomId) => {
    if (!window.confirm('Remove this debate room?')) {return;}
    try {
      await axios.delete(`/admin/rooms/${roomId}`);
      notify.success('Debate removed');
      refetchRooms();
      refetchStats();
    } catch (err) {
      notify.error('Failed to remove debate');
    }
  }, [notify, refetchRooms, refetchStats]);

  // Tabs configuration
  const tabs = useMemo(() => [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'reports', label: 'Reports', icon: AlertTriangle },
    { key: 'users', label: 'Users', icon: Users },
    { key: 'rooms', label: 'Rooms', icon: Monitor },
    { key: 'audit', label: 'Audit Log', icon: History },
  ], []);

  if (!isAdmin) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
            <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
            <p className="text-gray-400">You need administrator privileges.</p>
          </motion.div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <motion.div variants={pageEnter} initial="hidden" animate="visible" className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-neon/10 border border-neon/30">
              <Shield className="w-7 h-7 text-neon" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Admin Command Center</h1>
              <p className="text-gray-400 text-sm">ForReal platform moderation & insights.</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => { refetchStats(); refetchReports(); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300 hover:border-neon/50"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </motion.button>
        </motion.div>

        {/* Tabs */}
        <AdminTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} variants={pageEnter} initial="hidden" animate="visible" exit="hidden">
            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {statsLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {[...Array(4)].map((_, i) => <SectionSkeleton key={i} />)}
                  </div>
                ) : (
                  <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    <StatCard icon={Users} label="Total Users" value={stats?.totalUsers} color="neon" delay={0.1} />
                    <StatCard icon={MessageSquare} label="Total Talks" value={stats?.totalPosts} color="neon" delay={0.2} />
                    <StatCard icon={AlertTriangle} label="Pending Reports" value={stats?.pendingReports} color="red-400" delay={0.3} />
                    <StatCard icon={Activity} label="Online Now" value={stats?.onlineUsers} color="green-400" delay={0.4} />
                  </motion.div>
                )}

                {/* Additional quick stats */}
                <motion.div variants={cardVariant} className="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
                  <h2 className="text-white font-semibold text-lg mb-3 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-neon" /> Activity Overview
                  </h2>
                  {statsLoading ? <SectionSkeleton /> : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div><span className="text-gray-400">Talks today:</span> <span className="text-white">{stats?.talksToday || 0}</span></div>
                      <div><span className="text-gray-400">New users:</span> <span className="text-white">{stats?.newUsersToday || 0}</span></div>
                      <div><span className="text-gray-400">Reports resolved:</span> <span className="text-white">{stats?.resolvedReports || 0}</span></div>
                      <div><span className="text-gray-400">Active debates:</span> <span className="text-white">{stats?.activeRooms || 0}</span></div>
                    </div>
                  )}
                </motion.div>
              </div>
            )}

            {/* Reports Tab */}
            {activeTab === 'reports' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-white font-semibold text-lg flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-neon" /> Moderation Queue
                  </h2>
                  <span className="text-xs text-gray-400">{reports.length} items</span>
                </div>
                {reportsLoading ? (
                  <div className="space-y-3">{[1,2,3].map(i => <SectionSkeleton key={i} />)}</div>
                ) : reports.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10">
                    <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
                    <p>All clear! No pending reports.</p>
                  </div>
                ) : (
                  <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 divide-y divide-white/5">
                    {reports.map((report) => (
                      <ReportItem
                        key={report._id}
                        report={report}
                        onResolve={handleResolveReport}
                        onDismiss={handleDismissReport}
                        onDeleteUser={handleDeleteUser}
                      />
                    ))}
                  </motion.div>
                )}
                {!reportsLoading && reports.length > 0 && hasMore && (
                  <div className="flex justify-center">
                    <button onClick={loadMoreReports} className="text-neon text-sm hover:underline">Load more</button>
                  </div>
                )}
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h2 className="text-white font-semibold text-lg flex items-center gap-2">
                    <Users className="w-5 h-5 text-neon" /> User Management
                  </h2>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="pl-9 pr-4 py-2 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-neon/50 text-sm"
                    />
                  </div>
                </div>
                {usersLoading ? (
                  <div className="space-y-2">{[1,2,3].map(i => <SectionSkeleton key={i} />)}</div>
                ) : users.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10">No users found.</div>
                ) : (
                  <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 divide-y divide-white/5">
                    {users.map((u) => (
                      <UserRow key={u._id} user={u} onAction={handleUserAction} />
                    ))}
                  </motion.div>
                )}
              </div>
            )}

            {/* Rooms Tab */}
            {activeTab === 'rooms' && (
              <div className="space-y-4">
                <h2 className="text-white font-semibold text-lg flex items-center gap-2">
                  <Monitor className="w-5 h-5 text-neon" /> Active Debate Rooms
                </h2>
                {roomsLoading ? (
                  <div className="space-y-3">{[1,2,3].map(i => <SectionSkeleton key={i} />)}</div>
                ) : rooms.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10">No rooms active.</div>
                ) : (
                  <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {rooms.map((room) => (
                      <motion.div key={room._id} variants={cardVariant} className="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 p-4 hover:border-neon/40">
                        <div className="flex justify-between">
                          <div>
                            <h3 className="text-white font-medium">{room.topic || room.title}</h3>
                          <p className="text-xs text-gray-400 mt-1">{room.status} · {Array.isArray(room.participants) ? room.participants.length : (room.participantCount || 0)} debaters</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {room.status === 'active' && (
                              <button onClick={() => handleEndRoom(room._id)} className="text-xs text-yellow-300 hover:bg-yellow-400/10 px-3 py-1 rounded-lg border border-yellow-400/20">
                                End
                              </button>
                            )}
                            <button onClick={() => handleDeleteRoom(room._id)} className="text-xs text-red-400 hover:bg-red-400/10 px-3 py-1 rounded-lg border border-red-400/20">
                              Remove
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>
            )}

            {/* Audit Log Tab */}
            {activeTab === 'audit' && (
              <div className="space-y-4">
                <h2 className="text-white font-semibold text-lg flex items-center gap-2">
                  <History className="w-5 h-5 text-neon" /> Recent Audit Logs
                </h2>
                {logsLoading ? (
                  <div className="space-y-2">{[1,2,3].map(i => <SectionSkeleton key={i} />)}</div>
                ) : logs.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10">No logs available.</div>
                ) : (
                  <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 p-4 space-y-2">
                    {logs.map((log, idx) => (
                      <LogEntry key={idx} log={log} />
                    ))}
                  </motion.div>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </Layout>
  );
}
