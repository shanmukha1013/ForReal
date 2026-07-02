/**
 * ForReal — Layout.jsx
 * Production-grade app shell for "ForReal — We Don't Talk Shit."
 *
 * Architecture:
 *  ├── Icon map            (pure SVG components)
 *  ├── Custom hooks        (useSocketPresence, useSidebarData, useNotificationCount, useScrollDirection)
 *  ├── Animation presets   (spring / ease variants)
 *  ├── Sub-components
 *  │    ├── ForRealLogo
 *  │    ├── NavBadge
 *  │    ├── NavItem
 *  │    ├── UserCard
 *  │    ├── TrendingCard
 *  │    ├── SuggestionsCard
 *  │    ├── MobileBottomNav
 *  │    └── MobileTopBar
 *  └── Layout (default export)
 */

import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  memo,
} from "react";
import BackgroundAesthetics from './BackgroundAesthetics';
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import clsx from "clsx";
import { AuthContext } from "../context/AuthContext";
import api from "../api/api";
import axios from "../api/axios";
import { getSocket } from "../realtime/socket";

// ─────────────────────────────────────────────────────────────────
// SECTION 1 — ICON SYSTEM
// Each icon is a pure functional SVG component accepting className/style props.
// ─────────────────────────────────────────────────────────────────

const Icon = {
  Home: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9.75L12 3l9 6.75V21a1 1 0 01-1 1H5a1 1 0 01-1-1V9.75z" />
      <path d="M9 22V12h6v10" />
    </svg>
  ),
  HomeFilled: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.1L2 9.7V22h7v-7h6v7h7V9.7L12 2.1z" />
    </svg>
  ),
  Explore: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  ),
  ExploreFilled: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  ),
  Debates: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      <path d="M8 10h8M8 14h5" />
    </svg>
  ),
  DebatesFilled: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21 3H3a1 1 0 00-1 1v14a1 1 0 001 1h3v3l4-3h11a1 1 0 001-1V4a1 1 0 00-1-1zM8 11h8v1.5H8V11zm0-3.5h8V9H8V7.5zm6 7H8V13h6v1.5z" />
    </svg>
  ),
  Messages: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  ),
  MessagesFilled: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z" />
    </svg>
  ),
  Bell: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  ),
  BellFilled: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 22a2.5 2.5 0 002.5-2.5h-5A2.5 2.5 0 0012 22zm6-6V11a6 6 0 00-5-5.91V4a1 1 0 00-2 0v1.09A6 6 0 006 11v5l-2 2v1h16v-1l-2-2z" />
    </svg>
  ),
  Settings: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  ),
  Shield: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
  LogOut: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  ),
  Users: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  Flame: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2c0 0-4 4-4 9a4 4 0 008 0c0-2-1-3.5-1-3.5S13 10 11 12c0-3 1-10 1-10z" />
    </svg>
  ),
  ChevronRight: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 18l6-6-6-6" />
    </svg>
  ),
  Plus: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  UserPlus: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M8.5 11a4 4 0 100-8 4 4 0 000 8zM20 8v6M17 11h6" />
    </svg>
  ),
  X: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  ),
  Zap: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </svg>
  ),
};

// ─────────────────────────────────────────────────────────────────
// SECTION 2 — NAV CONFIG
// ─────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { to: "/",              label: "Home",          Icon: Icon.Home,         IconFilled: Icon.HomeFilled,       badgeKey: null },
  { to: "/explore",       label: "Explore",       Icon: Icon.Explore,      IconFilled: Icon.ExploreFilled,    badgeKey: null },
  { to: "/rooms",         label: "Debates 💬",       Icon: Icon.Debates,      IconFilled: Icon.DebatesFilled,    badgeKey: "rooms" },
  { to: "/messages",      label: "Messages",      Icon: Icon.Messages,     IconFilled: Icon.MessagesFilled,   badgeKey: "messages" },
  { to: "/notifications", label: "Notifications", Icon: Icon.Bell,         IconFilled: Icon.BellFilled,       badgeKey: "notifications" },
  { to: "/settings",      label: "Settings ⚙️",      Icon: Icon.Settings,     IconFilled: Icon.Settings,         badgeKey: null },
];

const ADMIN_NAV_ITEM = { to: "/admin", label: "Admin Panel", Icon: Icon.Shield, IconFilled: Icon.Shield, badgeKey: null };

const MOBILE_NAV = NAV_ITEMS.slice(0, 5);

// ─────────────────────────────────────────────────────────────────
// SECTION 3 — ANIMATION VARIANTS
// ─────────────────────────────────────────────────────────────────

const EASE_EXPO = [0.16, 1, 0.3, 1];
const EASE_BACK = [0.34, 1.56, 0.64, 1];

const sidebarVariants = {
  hidden:  { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.25, ease: EASE_EXPO, staggerChildren: 0.03, delayChildren: 0.02 },
  },
};

const rightSidebarVariants = {
  hidden:  { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.25, ease: EASE_EXPO, staggerChildren: 0.03, delayChildren: 0.02 },
  },
};

const navItemVariants = {
  hidden:   { opacity: 0, x: -12 },
  visible:  { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

const cardVariants = {
  hidden:   { opacity: 0, y: 12 },
  visible:  { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

const badgeVariants = {
  initial:  { scale: 0, opacity: 0 },
  animate:  { scale: 1, opacity: 1, transition: { type: "spring", stiffness: 600, damping: 22 } },
  exit:     { scale: 0, opacity: 0, transition: { duration: 0.15 } },
  bump:     { scale: [1, 1.4, 1], transition: { duration: 0.3, ease: EASE_BACK } },
};

const mainContentVariants = {
  hidden:   { opacity: 0, y: 10 },
  visible:  {
    opacity: 1,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
};

// ─────────────────────────────────────────────────────────────────
// SECTION 4 — CUSTOM HOOKS
// ─────────────────────────────────────────────────────────────────

/**
 * useSocketPresence
 * Registers the current user's presence on the socket and handles
 * badge count updates from the server via socket events.
 */
function useSocketPresence(user, setBadges) {
  useEffect(() => {
    if (!user) {return;}
    const socket  = getSocket();
    const userId  = user._id || user.id;

    socket.emit("presence:identify", { userId });

    const handleBadgeUpdate = ({ key, count }) => {
      setBadges((prev) => {
        if (prev[key] === count) {return prev;}
        return { ...prev, [key]: count };
      });
    };

    const handleMessagesBadge      = (data) => handleBadgeUpdate({ key: "messages",      count: data.unread });
    const handleNotificationsBadge = (data) => handleBadgeUpdate({ key: "notifications", count: data.unread });
    const handleRoomsBadge         = (data) => handleBadgeUpdate({ key: "rooms",         count: data.active });

    socket.on("badge:messages",      handleMessagesBadge);
    socket.on("badge:notifications", handleNotificationsBadge);
    socket.on("badge:rooms",         handleRoomsBadge);

    const updateLocalBadges = () => {
      const notifs = JSON.parse(localStorage.getItem('forreal_notifications') || '[]');
      const unreadNotifs = notifs.filter(n => !n.read).length;
      handleBadgeUpdate({ key: 'notifications', count: unreadNotifs });
    };

    updateLocalBadges();
    const interval = setInterval(updateLocalBadges, 2000);
    window.addEventListener('storage', updateLocalBadges);
    window.addEventListener('local_notify', updateLocalBadges);

    return () => {
      socket.off("badge:messages",      handleMessagesBadge);
      socket.off("badge:notifications", handleNotificationsBadge);
      socket.off("badge:rooms",         handleRoomsBadge);
      clearInterval(interval);
      window.removeEventListener('storage', updateLocalBadges);
      window.removeEventListener('local_notify', updateLocalBadges);
    };
  }, [user, setBadges]);
}

/**
 * useSidebarData
 * Fetches trending rooms and user suggestions for the right sidebar.
 * Returns state + a manual refresh function.
 */
function useSidebarData() {
  const [trending,    setTrending]    = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [lastFetched, setLastFetched] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch trending rooms and suggested users from available endpoints
      const [roomsRes, usersRes] = await Promise.all([
        axios.get("/rooms").catch(() => ({ data: { rooms: [] } })),
        axios.get("/users/search", { params: { q: '', limit: 5 } }).catch(() => ({ data: { users: [] } })),
      ]);
      setTrending((roomsRes.data?.rooms || []).slice(0, 5));
      setSuggestions((usersRes.data?.users || []).slice(0, 5));
      setLastFetched(Date.now());
    } catch {
      // sidebar data is non-critical; silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Refresh every 90 seconds for a live feel
    const interval = setInterval(fetchData, 90_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { trending, suggestions, loading, lastFetched, refresh: fetchData };
}

/**
 * useScrollDirection
 * Returns 'up' | 'down' | 'idle' — used to auto-hide/show mobile top bar.
 */
function useScrollDirection(threshold = 8) {
  const [direction, setDirection] = useState("idle");
  const lastY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y     = window.scrollY;
      const delta = y - lastY.current;
      if (Math.abs(delta) < threshold) {return;}
      setDirection(delta > 0 ? "down" : "up");
      lastY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return direction;
}

/**
 * useFollowState
 * Manages optimistic follow/unfollow state for the suggestions list.
 */
function useFollowState(users) {
  const [followState, setFollowState] = useState({});

  const toggleFollow = useCallback(async (userId) => {
    setFollowState((prev) => ({ ...prev, [userId]: !prev[userId] }));
    try {
      await api.post(`/users/${userId}/follow`);
    } catch {
      // revert on failure
      setFollowState((prev) => ({ ...prev, [userId]: !prev[userId] }));
    }
  }, []);

  const isFollowing = useCallback(
    (userId) => followState[userId] ?? false,
    [followState]
  );

  return { toggleFollow, isFollowing };
}

// ─────────────────────────────────────────────────────────────────
// SECTION 5 — DESIGN TOKENS (CSS-in-JS)
// ─────────────────────────────────────────────────────────────────

const TOKEN = {
  bg:           "var(--bg-primary)",
  surface:      "var(--surface)",
  surfaceHover: "var(--surface-elevated)",
  border:       "var(--border)",
  borderActive: "var(--border-active)",
  brand:        "var(--brand-primary)",
  brandDim:     "var(--brand-hover)",
  brandGlow:    "var(--brand-glow)",
  brandSub:     "rgba(193,18,31,0.1)",
  text:         "var(--text-primary)",
  textMuted:    "var(--text-muted)",
  textDim:      "var(--text-secondary)",
  glass:        "var(--surface)",
  blur:         "blur(24px)",
};



// ─────────────────────────────────────────────────────────────────
// SECTION 6 — SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────

// ── Logo ──────────────────────────────────────────────────────────
const ForRealLogo = memo(function ForRealLogo() {
  return (
    <Link
      to="/"
      aria-label="ForReal — Home"
      className="group flex items-center gap-3 px-2 py-2 rounded-xl transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-[#C1121F]/50"
    >
      {/* FR wordmark — F white, R green, no icon, no background */}
      <span
        className="select-none tracking-tight font-black"
        style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", fontSize: "22px", letterSpacing: "-0.05em", lineHeight: "1" }}
      >
        <span style={{ color: "#000000", WebkitTextStroke: "1px #ffffff" }}>F</span>
        <span style={{ color: TOKEN.brand }}>R</span>
      </span>

      {/* Wordmark */}
      <div className="min-w-0">
        <div
          className="font-black select-none"
          style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: "20px", letterSpacing: "-0.04em", lineHeight: "1" }}
        >
          <span style={{ color: "#000000", WebkitTextStroke: "1px #ffffff" }}>FOR</span><span style={{ color: TOKEN.brand }}>REAL</span>
        </div>
        <div
          className="text-[9px] tracking-[0.2em] uppercase mt-[4px] select-none"
          style={{ fontFamily: "'Space Mono', 'Courier New', monospace", color: TOKEN.textDim }}
        >
          We Don't Talk Shit
        </div>
      </div>
    </Link>
  );
});

// ── Notification Badge ─────────────────────────────────────────────
const NavBadge = memo(function NavBadge({ count }) {
  if (!count || count < 1) {return null;}
  const display = count > 99 ? "99+" : String(count);

  return (
    <AnimatePresence>
      <motion.span
        key={count}
        variants={badgeVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="absolute -top-1 -right-1 min-w-[16px] h-4 px-[3px] rounded-full flex items-center justify-center text-[9px] font-black tracking-tight select-none pointer-events-none"
        style={{
          background: "linear-gradient(135deg, #C1121F, #16a34a)",
          color: "#000",
          boxShadow: "0 0 6px rgba(193,18,31,0.6), 0 0 0 1.5px rgba(7,7,7,1)",
          fontFamily: "'Space Mono', monospace",
        }}
        aria-label={`${count} unread`}
      >
        {display}
      </motion.span>
    </AnimatePresence>
  );
});

// ── Live Pulse Indicator ───────────────────────────────────────────
const LivePulse = memo(function LivePulse({ size = 8 }) {
  return (
    <span className="relative flex" style={{ width: size, height: size }}>
      <span
        className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
        style={{ background: TOKEN.brand }}
      />
      <span
        className="relative inline-flex rounded-full"
        style={{
          width: size,
          height: size,
          background: TOKEN.brand,
          boxShadow: `0 0 ${size / 2}px ${TOKEN.brandGlow}`,
        }}
      />
    </span>
  );
});

// ── Skeleton Loader ────────────────────────────────────────────────
const Skeleton = memo(function Skeleton({ className = "", style = {} }) {
  return (
    <div
      className={clsx("rounded-lg animate-pulse", className)}
      style={{ background: "rgba(255,255,255,0.04)", ...style }}
      aria-hidden="true"
    />
  );
});

// ── NavItem ────────────────────────────────────────────────────────
const NavItem = memo(function NavItem({ item, badge = 0, onClick }) {
  const location  = useLocation();
  const shouldReduceMotion = useReducedMotion();

  const isActive = useMemo(
    () => (item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to)),
    [item.to, location.pathname]
  );

  const ActiveIcon   = item.IconFilled || item.Icon;
  const InactiveIcon = item.Icon;
  const CurrentIcon  = isActive ? ActiveIcon : InactiveIcon;

  return (
    <motion.div variants={navItemVariants} className="relative">
      <NavLink
        to={item.to}
        onClick={onClick}
        aria-label={item.label}
        aria-current={isActive ? "page" : undefined}
        className={clsx(
          "group relative flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl transition-all duration-200 overflow-hidden outline-none",
          "focus-visible:ring-2 focus-visible:ring-[#C1121F]/40"
        )}
        style={
          isActive
            ? { background: TOKEN.surfaceHover, border: `1px solid ${TOKEN.borderActive}` }
            : { border: "1px solid transparent" }
        }
      >
        {/* Active left accent bar */}
        {isActive && !shouldReduceMotion && (
          <motion.div
            layoutId="nav-active-bar"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full"
            style={{ background: TOKEN.brand, boxShadow: `0 0 10px ${TOKEN.brandGlow}` }}
            transition={{ type: "spring", stiffness: 500, damping: 32 }}
          />
        )}

        {/* Hover shimmer overlay */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{ background: "linear-gradient(135deg, rgba(193,18,31,0.03) 0%, transparent 60%)" }}
        />

        {/* Icon wrapper with badge */}
        <div className="relative flex-shrink-0">
          <CurrentIcon
            className={clsx(
              "w-[18px] h-[18px] transition-all duration-200",
              isActive
                ? "text-[#C1121F]"
                : "text-zinc-500 group-hover:text-zinc-300"
            )}
            style={isActive ? { filter: `drop-shadow(0 0 5px ${TOKEN.brandGlow})` } : {}}
          />
          <NavBadge count={badge} />
        </div>

        {/* Label */}
        <span
          className={clsx(
            "relative text-[13.5px] font-semibold tracking-wide transition-colors duration-200 select-none",
            isActive ? "text-[#C1121F]" : "text-zinc-400 group-hover:text-zinc-100"
          )}
        >
          {item.label}
        </span>

        {/* Badge count (for screen readers already in NavBadge, this is visual-only supplement) */}
        {badge > 0 && !isActive && (
          <span
            className="ml-auto text-[10px] font-bold text-zinc-500 group-hover:text-zinc-300 transition-colors"
            aria-hidden="true"
          >
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </NavLink>
    </motion.div>
  );
});

// ── Create Debate Button ────────────────────────────────────────────
const CreateDebateButton = memo(function CreateDebateButton() {
  return (
    <motion.div variants={navItemVariants} className="px-1 pt-1">
      <Link
        to="/rooms"
        aria-label="Start a new debate"
        className="group relative flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-bold tracking-wide transition-all duration-200 overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 bg-brand text-white hover:bg-brand-hover shadow-md hover:shadow-glow-sm"
      >
        <Icon.Plus className="relative w-4 h-4" />
        <span className="relative" style={{ fontFamily: "'Space Mono', monospace", fontSize: "11px", letterSpacing: "1px" }}>
          NEW DEBATE
        </span>
      </Link>
    </motion.div>
  );
});

// ── User Card (Left Sidebar) ──────────────────────────────────────
const UserCard = memo(function UserCard({ user, onLogout }) {
  const meId = user?._id || user?.id;
  const [logoutLoading, setLogoutLoading] = useState(false);

  const handleLogout = useCallback(async () => {
    setLogoutLoading(true);
    await onLogout();
    setLogoutLoading(false);
  }, [onLogout]);

  return (
    <motion.div
      variants={cardVariants}
      className="rounded-2xl overflow-hidden glass-panel"
    >
      {/* Top accent line */}
      <div
        className="h-px w-full"
        style={{ background: "linear-gradient(to right, transparent 0%, rgba(193,18,31,0.5) 50%, transparent 100%)" }}
      />

      <div className="p-4">
        {/* User identity row */}
        <div className="flex items-center gap-3">
          {/* Avatar with online indicator */}
          <Link
            to={`/profile/${meId}`}
            aria-label={`View ${user?.displayName || "your"} profile`}
            className="relative flex-shrink-0 group outline-none focus-visible:ring-2 focus-visible:ring-[#C1121F]/50 rounded-full"
          >
            <img
              src={user?.avatar || `https://api.dicebear.com/7.x/shapes/svg?seed=${user?.username || "user"}`}
              alt={user?.displayName || "Your avatar"}
              className="h-11 w-11 rounded-full object-cover transition-all duration-300 group-hover:brightness-110"
              style={{ border: `2px solid rgba(193,18,31,0.2)` }}
              loading="lazy"
            />
            {/* Online badge */}
            <span
              className="absolute -bottom-0.5 -right-0.5 h-[13px] w-[13px] rounded-full"
              style={{
                background: TOKEN.brand,
                border: `2.5px solid ${TOKEN.bg}`,
                boxShadow: `0 0 6px ${TOKEN.brandGlow}`,
              }}
              aria-label="Online"
            />
          </Link>

          {/* Names */}
          <div className="min-w-0 flex-1">
            <div
              className="text-[13px] font-bold text-brand truncate leading-snug"
              title={user?.displayName}
            >
              {user?.displayName || "New User"}
            </div>
            <div
              className="text-[11px] truncate mt-0.5"
              style={{ fontFamily: "'Space Mono', monospace", color: TOKEN.textMuted }}
              title={`@${user?.username}`}
            >
              @{user?.username || "setup"}
            </div>
          </div>
        </div>

        {/* Stats row */}
        {(user?.followersCount !== undefined || user?.followingCount !== undefined) && (
          <div
            className="mt-3.5 flex items-center gap-4 px-3 py-2 rounded-xl"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
          >
            <Link to={`/profile/${meId}/followers`} className="text-center group outline-none">
              <div className="text-[13px] font-bold text-brand group-hover:text-[#C1121F] transition-colors">
                {(user?.followersCount || 0).toLocaleString()}
              </div>
              <div className="text-[9px] text-zinc-600 tracking-widest uppercase mt-0.5" style={{ fontFamily: "'Space Mono', monospace" }}>
                Followers
              </div>
            </Link>
            <div className="w-px h-6" style={{ background: "rgba(255,255,255,0.08)" }} />
            <Link to={`/profile/${meId}/following`} className="text-center group outline-none">
              <div className="text-[13px] font-bold text-brand group-hover:text-[#C1121F] transition-colors">
                {(user?.followingCount || 0).toLocaleString()}
              </div>
              <div className="text-[9px] text-zinc-600 tracking-widest uppercase mt-0.5" style={{ fontFamily: "'Space Mono', monospace" }}>
                Following
              </div>
            </Link>
            <div className="w-px h-6" style={{ background: "rgba(255,255,255,0.08)" }} />
            <Link to={`/profile/${meId}/debates`} className="text-center group outline-none">
              <div className="text-[13px] font-bold text-brand group-hover:text-[#C1121F] transition-colors">
                {(user?.debatesCount || 0).toLocaleString()}
              </div>
              <div className="text-[9px] text-zinc-600 tracking-widest uppercase mt-0.5" style={{ fontFamily: "'Space Mono', monospace" }}>
                Debates
              </div>
            </Link>
          </div>
        )}

        {/* Actions row */}
        <div className="mt-3 flex gap-2">
          <Link
            to={`/profile/${meId}`}
            aria-label="View your profile"
            className="group flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-[11px] font-bold tracking-wide transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[#C1121F]/40"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.09)",
              color: TOKEN.text,
              fontFamily: "'Space Mono', monospace",
              letterSpacing: "0.05em",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.border = "1px solid rgba(193,18,31,0.2)";
              e.currentTarget.style.color  = TOKEN.brand;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.border = "1px solid rgba(255,255,255,0.09)";
              e.currentTarget.style.color  = TOKEN.text;
            }}
          >
            Profile
          </Link>

          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={handleLogout}
            disabled={logoutLoading}
            aria-label="Log out"
            className="group flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-[11px] font-bold tracking-wide transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              color: TOKEN.textMuted,
              fontFamily: "'Space Mono', monospace",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.border = "1px solid rgba(239,68,68,0.25)";
              e.currentTarget.style.color  = "#f87171";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.border = "1px solid rgba(255,255,255,0.07)";
              e.currentTarget.style.color  = TOKEN.textMuted;
            }}
          >
            {logoutLoading
              ? <span className="h-3 w-3 rounded-full border-2 border-red-400/40 border-t-red-400 animate-spin" />
              : <Icon.LogOut className="w-3.5 h-3.5" />
            }
            Log out
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
});

// ── Trending Rooms Card (Right Sidebar) ───────────────────────────
const TrendingCard = memo(function TrendingCard({ rooms, loading }) {
  return (
    <motion.div
      variants={cardVariants}
      className="rounded-2xl overflow-hidden glass-panel"
    >
      <div
        className="h-px w-full"
        style={{ background: "linear-gradient(to right, transparent 0%, rgba(193,18,31,0.4) 50%, transparent 100%)" }}
      />
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Icon.Flame
              className="w-3.5 h-3.5"
              style={{ color: TOKEN.brand }}
            />
            <span
              className="text-[11px] font-bold text-brand tracking-[0.15em] uppercase select-none"
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              Trending
            </span>
          </div>
          <Link
            to="/rooms"
            aria-label="See all debates"
            className="text-[10px] tracking-wider uppercase transition-colors outline-none focus-visible:ring-1 focus-visible:ring-[#C1121F]/40 rounded"
            style={{ fontFamily: "'Space Mono', monospace", color: TOKEN.brandDim }}
            onMouseEnter={(e) => (e.currentTarget.style.color = TOKEN.brand)}
            onMouseLeave={(e) => (e.currentTarget.style.color = TOKEN.brandDim)}
          >
            All →
          </Link>
        </div>

        {/* List */}
        <div className="space-y-1" role="list" aria-label="Trending debates">
          {loading ? (
            Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl">
                <Skeleton className="w-2 h-2 mt-1 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-2.5 w-3/4" />
                  <Skeleton className="h-2 w-1/2" />
                </div>
              </div>
            ))
          ) : rooms.length > 0 ? (
            rooms.slice(0, 6).map((room, i) => (
              <TrendingRoomRow key={room._id} room={room} index={i} />
            ))
          ) : (
            <div
              className="py-6 text-center text-[11px] tracking-widest"
              style={{ fontFamily: "'Space Mono', monospace", color: TOKEN.textDim }}
            >
              No debates yet
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});

// ── Single trending room row (extracted for perf) ─────────────────
const TrendingRoomRow = memo(function TrendingRoomRow({ room, index }) {
  const isLive = room.status === "active";

  return (
    <motion.div
      role="listitem"
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        to={`/rooms/${room._id}`}
        aria-label={`${room.topic} — ${isLive ? "Live" : "Ended"}, ${room.spectators || 0} watching`}
        className="group flex items-start gap-3 p-2.5 rounded-xl border border-transparent transition-all duration-200 outline-none focus-visible:ring-1 focus-visible:ring-[#C1121F]/40"
        onMouseEnter={(e) => {
          e.currentTarget.style.background   = TOKEN.surfaceHover;
          e.currentTarget.style.borderColor  = TOKEN.borderActive;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background   = "";
          e.currentTarget.style.borderColor  = "transparent";
        }}
      >
        {/* Status indicator */}
        <div className="flex-shrink-0 mt-1.5">
          {isLive ? <LivePulse size={7} /> : (
            <span
              className="h-[7px] w-[7px] rounded-full block"
              style={{ background: TOKEN.textDim }}
            />
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div
            className="text-[12px] font-semibold leading-snug truncate transition-colors duration-200"
            style={{ color: TOKEN.text }}
          >
            {room.topic}
          </div>
          <div className="flex items-center gap-2 mt-1">
            {isLive && (
              <span
                className="text-[9px] font-black tracking-[0.15em]"
                style={{ fontFamily: "'Space Mono', monospace", color: TOKEN.brand }}
              >
                LIVE
              </span>
            )}
            <span
              className="text-[10px]"
              style={{ color: TOKEN.textMuted }}
            >
              {(room.spectators || 0).toLocaleString()} watching
            </span>
          </div>
        </div>

        {/* Arrow */}
        <Icon.ChevronRight
          className="w-3.5 h-3.5 flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-all duration-200 -translate-x-1 group-hover:translate-x-0"
          style={{ color: TOKEN.brandDim }}
        />
      </Link>
    </motion.div>
  );
});

// ── Suggestions Card (Right Sidebar) ──────────────────────────────
const SuggestionsCard = memo(function SuggestionsCard({ users, loading }) {
  const { toggleFollow, isFollowing } = useFollowState(users);

  return (
    <motion.div
      variants={cardVariants}
      className="rounded-2xl overflow-hidden glass-panel"
    >
      <div
        className="h-px w-full"
        style={{ background: "linear-gradient(to right, transparent 0%, rgba(193,18,31,0.4) 50%, transparent 100%)" }}
      />
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Icon.Users
              className="w-3.5 h-3.5"
              style={{ color: TOKEN.brand }}
            />
            <span
              className="text-[11px] font-bold text-brand tracking-[0.15em] uppercase select-none"
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              Who to Follow
            </span>
          </div>
          <Link
            to="/explore"
            aria-label="More suggestions"
            className="text-[10px] tracking-wider uppercase transition-colors outline-none focus-visible:ring-1 focus-visible:ring-[#C1121F]/40 rounded"
            style={{ fontFamily: "'Space Mono', monospace", color: TOKEN.brandDim }}
            onMouseEnter={(e) => (e.currentTarget.style.color = TOKEN.brand)}
            onMouseLeave={(e) => (e.currentTarget.style.color = TOKEN.brandDim)}
          >
            More →
          </Link>
        </div>

        {/* List */}
        <div className="space-y-0.5" role="list" aria-label="Suggested users to follow">
          {loading ? (
            Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl">
                <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-2.5 w-2/3" />
                  <Skeleton className="h-2 w-1/2" />
                </div>
                <Skeleton className="h-6 w-12 rounded-lg flex-shrink-0" />
              </div>
            ))
          ) : users.length > 0 ? (
            users.slice(0, 5).map((u, i) => (
              <SuggestionUserRow
                key={u._id}
                user={u}
                index={i}
                following={isFollowing(u._id)}
                onFollow={() => toggleFollow(u._id)}
              />
            ))
          ) : (
            <div
              className="py-6 text-center text-[11px] tracking-widest"
              style={{ fontFamily: "'Space Mono', monospace", color: TOKEN.textDim }}
            >
              No suggestions
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});

// ── Single suggestion row ─────────────────────────────────────────
const SuggestionUserRow = memo(function SuggestionUserRow({ user, index, following, onFollow }) {
  return (
    <motion.div
      role="listitem"
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-center gap-3 p-2.5 rounded-xl border border-transparent transition-all duration-200"
      onMouseEnter={(e) => {
        e.currentTarget.style.background  = TOKEN.surfaceHover;
        e.currentTarget.style.borderColor = TOKEN.borderActive;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background  = "";
        e.currentTarget.style.borderColor = "transparent";
      }}
    >
      {/* Avatar */}
      <Link
        to={`/profile/${user._id}`}
        aria-label={`View ${user.displayName || user.username}'s profile`}
        className="flex-shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#C1121F]/40"
        tabIndex={0}
      >
        <img
          src={user.avatar || `https://api.dicebear.com/7.x/shapes/svg?seed=${user.username}`}
          alt={user.displayName || user.username}
          className="h-9 w-9 rounded-full object-cover transition-all duration-200 hover:brightness-110"
          style={{ border: `1.5px solid rgba(255,255,255,0.08)` }}
          loading="lazy"
        />
      </Link>

      {/* Name */}
      <Link
        to={`/profile/${user._id}`}
        className="min-w-0 flex-1 group outline-none focus-visible:underline"
        tabIndex={-1}
        aria-hidden="true"
      >
        <div className="text-[12px] font-semibold truncate group-hover:text-brand transition-colors" style={{ color: TOKEN.text }}>
          {user.displayName || user.username || "User"}
        </div>
        <div
          className="text-[10px] truncate mt-0.5"
          style={{ fontFamily: "'Space Mono', monospace", color: TOKEN.textMuted }}
        >
          @{user.username || "user"}
        </div>
      </Link>

      {/* Follow button */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={onFollow}
        aria-label={following ? `Unfollow @${user.username}` : `Follow @${user.username}`}
        aria-pressed={following}
        className="flex-shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[#C1121F]/40"
        style={
          following
            ? {
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: TOKEN.textMuted,
                fontFamily: "'Space Mono', monospace",
              }
            : {
                background: "rgba(193,18,31,0.1)",
                border: `1px solid rgba(193,18,31,0.25)`,
                color: TOKEN.brand,
                fontFamily: "'Space Mono', monospace",
              }
        }
      >
        {following ? "Following" : "Follow"}
      </motion.button>
    </motion.div>
  );
});

// ── Footer Links ───────────────────────────────────────────────────
const SidebarFooter = memo(function SidebarFooter() {
  const LINKS = [
    { label: "Privacy",  href: "/privacy" },
    { label: "Terms",    href: "/terms" },
    { label: "About",    href: "/about" },
    { label: "Contact",  href: "/contact" },
    { label: "Blog",     href: "/blog" },
  ];

  return (
    <motion.div variants={cardVariants} className="px-1 pb-2">
      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
        {LINKS.map((link) => (
          <Link
            key={link.label}
            to={link.href}
            className="text-[9px] tracking-wider uppercase transition-colors outline-none focus-visible:underline"
            style={{ fontFamily: "'Space Mono', monospace", color: TOKEN.textDim }}
            onMouseEnter={(e) => (e.currentTarget.style.color = TOKEN.textMuted)}
            onMouseLeave={(e) => (e.currentTarget.style.color = TOKEN.textDim)}
          >
            {link.label}
          </Link>
        ))}
      </div>
      <p
        className="mt-2 text-[9px] tracking-[0.2em] select-none"
        style={{ fontFamily: "'Space Mono', monospace", color: TOKEN.textDim }}
      >
        © {new Date().getFullYear()} FORREAL · WE DON'T TALK SHIT
      </p>
    </motion.div>
  );
});

// ── Mobile Bottom Navigation ───────────────────────────────────────
const MobileBottomNav = memo(function MobileBottomNav({ badges }) {
  const location           = useLocation();
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.nav
      initial={shouldReduceMotion ? false : { y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: EASE_EXPO, delay: 0.1 }}
      role="navigation"
      aria-label="Mobile navigation"
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
      style={{
        background: TOKEN.glass,
        backdropFilter: TOKEN.blur,
        WebkitBackdropFilter: TOKEN.blur,
        borderTop: `1px solid rgba(255,255,255,0.07)`,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {/* Top hairline glow */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(to right, transparent, var(--brand-glow), transparent)" }}
        aria-hidden="true"
      />

      <div className="flex items-center justify-around px-1 py-1.5">
        {MOBILE_NAV.map((item) => {
          const isActive   = item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
          const ActiveIcon = item.IconFilled || item.Icon;
          const CurrIcon   = isActive ? ActiveIcon : item.Icon;
          const badge      = badges[item.badgeKey] || 0;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              className="relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[#C1121F]/40 min-w-[52px]"
            >
              {/* Active background pill */}
              <AnimatePresence>
                {isActive && !shouldReduceMotion && (
                  <motion.div
                    layoutId="mobile-nav-bg"
                    className="absolute inset-0 rounded-xl"
                    style={{ background: "var(--border-active)", border: `1px solid var(--brand-glow)` }}
                    transition={{ type: "spring", stiffness: 450, damping: 30 }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  />
                )}
              </AnimatePresence>

              {/* Icon + Badge */}
              <div className="relative">
                <CurrIcon
                  className={clsx(
                    "relative w-5 h-5 transition-all duration-200",
                    isActive ? "text-[#C1121F]" : "text-zinc-500"
                  )}
                  style={isActive ? { filter: `drop-shadow(0 0 5px ${TOKEN.brandGlow})` } : {}}
                />
                <NavBadge count={badge} />
              </div>

              {/* Label */}
              <span
                className={clsx(
                  "relative text-[8px] font-bold tracking-[0.12em] uppercase transition-colors select-none",
                  isActive ? "text-[#C1121F]" : "text-zinc-600"
                )}
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </motion.nav>
  );
});

// ── Mobile Top Bar ─────────────────────────────────────────────────
const MobileTopBar = memo(function MobileTopBar({ badges, user }) {
  const scrollDir          = useScrollDirection(12);
  const shouldReduceMotion = useReducedMotion();
  const meId               = user?._id || user?.id;
  const notifBadge         = badges["notifications"] || 0;
  const msgBadge           = badges["messages"]      || 0;

  return (
    <motion.header
      initial={shouldReduceMotion ? false : { y: -20, opacity: 0 }}
      animate={{
        y:       scrollDir === "down" ? -80 : 0,
        opacity: scrollDir === "down" ? 0 : 1,
      }}
      transition={{ duration: 0.35, ease: EASE_EXPO }}
      role="banner"
      aria-label="ForReal — top navigation"
      className="lg:hidden flex items-center justify-between px-4 py-2.5 mb-3 rounded-2xl sticky top-3 z-40"
      style={{
        background: TOKEN.glass,
        backdropFilter: TOKEN.blur,
        WebkitBackdropFilter: TOKEN.blur,
        border: `1px solid rgba(255,255,255,0.07)`,
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
      }}
    >
      <ForRealLogo />

      <div className="flex items-center gap-1.5">
        {/* Notifications shortcut */}
        <NavLink
          to="/notifications"
          aria-label={`Notifications${notifBadge ? ` — ${notifBadge} unread` : ""}`}
          className="relative p-2 rounded-xl transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[#C1121F]/40"
          style={{ color: TOKEN.textMuted }}
          onMouseEnter={(e) => (e.currentTarget.style.color = TOKEN.text)}
          onMouseLeave={(e) => (e.currentTarget.style.color = TOKEN.textMuted)}
        >
          <Icon.Bell className="w-5 h-5" />
          <NavBadge count={notifBadge} />
        </NavLink>

        {/* Messages shortcut */}
        <NavLink
          to="/messages"
          aria-label={`Messages${msgBadge ? ` — ${msgBadge} unread` : ""}`}
          className="relative p-2 rounded-xl transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[#C1121F]/40"
          style={{ color: TOKEN.textMuted }}
          onMouseEnter={(e) => (e.currentTarget.style.color = TOKEN.text)}
          onMouseLeave={(e) => (e.currentTarget.style.color = TOKEN.textMuted)}
        >
          <Icon.Messages className="w-5 h-5" />
          <NavBadge count={msgBadge} />
        </NavLink>

        {/* Avatar shortcut */}
        {user && (
          <Link
            to={`/profile/${meId}`}
            aria-label="Your profile"
            className="outline-none focus-visible:ring-2 focus-visible:ring-[#C1121F]/40 rounded-full"
          >
            <img
              src={user.avatar || `https://api.dicebear.com/7.x/shapes/svg?seed=${user.username}`}
              alt={user.displayName || "Your avatar"}
              className="h-8 w-8 rounded-full object-cover"
              style={{ border: `1.5px solid rgba(193,18,31,0.2)` }}
              loading="lazy"
            />
          </Link>
        )}
      </div>
    </motion.header>
  );
});

// ── Ambient Background ─────────────────────────────────────────────
const AmbientBackground = memo(function AmbientBackground() {
  return (
    <BackgroundAesthetics />
  );
});

// ─────────────────────────────────────────────────────────────────
// SECTION 7 — MAIN LAYOUT (DEFAULT EXPORT)
// ─────────────────────────────────────────────────────────────────

export default function Layout({ children }) {
  const { user, logout }   = useContext(AuthContext) || { user: null, logout: () => {} };
  const navigate           = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  // Badge counts — keyed by NAV_ITEMS[*].badgeKey
  const [badges, setBadges] = useState({ messages: 0, notifications: 0, rooms: 0 });

  // Sidebar data + polling
  const {
    trending,
    suggestions,
    loading: sidebarLoading,
  } = useSidebarData();

  // Socket: presence + real-time badge pushes
  useSocketPresence(user, setBadges);

  // Stable logout handler
  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
    }
  }, [logout, navigate]);

  return (
    <div
      className="min-h-screen"
      style={{ background: TOKEN.bg }}
    >
      <AmbientBackground />

      {/* ── Page wrapper ── */}
      <div className="relative mx-auto max-w-[1400px] px-3 sm:px-4 xl:px-6">
        <div
          className={clsx(
            "grid gap-3 sm:gap-4 py-3 sm:py-4",
            // Responsive grid: single col → 3-col
            "grid-cols-1",
            "lg:grid-cols-[272px_1fr_300px]",
            "xl:grid-cols-[288px_1fr_316px]",
            // Bottom padding reserves space for mobile bottom nav
            "pb-24 lg:pb-4"
          )}
        >

          {/* ══════════════════════════════════════════════
              LEFT SIDEBAR
          ══════════════════════════════════════════════ */}
          <aside
            className="hidden lg:block"
            aria-label="Main navigation"
          >
            <motion.div
              className="sticky space-y-2.5"
              style={{ top: "16px" }}
              variants={sidebarVariants}
              initial={shouldReduceMotion ? "visible" : "hidden"}
              animate="visible"
            >
              {/* Logo */}
              <motion.div variants={cardVariants} className="px-1">
                <ForRealLogo />
              </motion.div>

              {/* Navigation */}
              <motion.nav
                variants={cardVariants}
                aria-label="Primary navigation"
                className="rounded-2xl overflow-hidden p-2 space-y-0.5 glass-panel"
              >
                {NAV_ITEMS.map((item) => (
                  <NavItem
                    key={item.to}
                    item={item}
                    badge={badges[item.badgeKey] || 0}
                  />
                ))}

                {user?.role === "admin" && (
                  <NavItem item={ADMIN_NAV_ITEM} badge={0} />
                )}
              </motion.nav>

              {/* Create debate CTA */}
              <motion.div variants={navItemVariants}>
                <CreateDebateButton />
              </motion.div>

              {/* User Card */}
              {user && <UserCard user={user} onLogout={handleLogout} />}
            </motion.div>
          </aside>

          {/* ══════════════════════════════════════════════
              MAIN FEED
          ══════════════════════════════════════════════ */}
          <main
            className="min-w-0 flex flex-col"
            id="main-content"
            role="main"
            aria-label="Main content"
          >
            {/* Mobile-only top bar */}
            <MobileTopBar badges={badges} user={user} />

            {/* Page content with entrance animation */}
            <motion.div
              variants={mainContentVariants}
              initial={shouldReduceMotion ? "visible" : "hidden"}
              animate="visible"
              className="flex-1"
            >
              {children}
            </motion.div>
          </main>

          {/* ══════════════════════════════════════════════
              RIGHT SIDEBAR
          ══════════════════════════════════════════════ */}
          <aside
            className="hidden lg:block"
            aria-label="Trending debates and suggestions"
          >
            <motion.div
              className="sticky space-y-3"
              style={{ top: "16px" }}
              variants={rightSidebarVariants}
              initial={shouldReduceMotion ? "visible" : "hidden"}
              animate="visible"
            >
              <TrendingCard   rooms={trending}    loading={sidebarLoading} />
              <SuggestionsCard users={suggestions} loading={sidebarLoading} />
              <SidebarFooter />
            </motion.div>
          </aside>

        </div>
      </div>

      {/* ── Mobile Bottom Navigation ── */}
      <MobileBottomNav badges={badges} />
    </div>
  );
}