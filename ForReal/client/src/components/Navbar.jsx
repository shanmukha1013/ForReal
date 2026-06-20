/**
 * ForReal — Navbar.jsx
 * Production-grade top navigation bar for "ForReal — We Don't Talk Shit."
 *
 * Fixes from original:
 *  ✗ handleLogout referenced but never defined → ✓ useCallback + AuthContext
 *  ✗ setDrawer/drawerOpen never declared      → ✓ useState(false)
 *  ✗ navLinks/isAdmin never computed           → ✓ useMemo from user context
 *  ✗ Bottom nav: raw inline styles, /home href → ✓ Full glassmorphic animated nav
 *  ✗ No scroll-hide behaviour                  → ✓ useScrollDirection hook
 *  ✗ No badge/notification counts              → ✓ Socket-driven badge system
 *  ✗ No keyboard trap in drawer               → ✓ useFocusTrap hook
 *  ✗ No aria-* attributes                     → ✓ Full ARIA throughout
 *
 * Architecture:
 *  ├── Icons
 *  ├── Design tokens
 *  ├── Nav config (buildNavLinks)
 *  ├── Animation variants
 *  ├── Custom hooks
 *  │    ├── useScrollDirection
 *  │    ├── useFocusTrap
 *  │    ├── useOutsideClick
 *  │    └── useNavBadges
 *  ├── Sub-components
 *  │    ├── NavLogo
 *  │    ├── NavBadge
 *  │    ├── DesktopNavLink
 *  │    ├── UserDropdown  + DropdownItem
 *  │    ├── MobileDrawer  + DrawerNavLink
 *  │    └── MobileBottomBar
 *  └── Navbar (default export)
 */

import {
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  memo,
} from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { AuthContext } from "../context/AuthContext";
import { getSocket } from "../realtime/socket";
import useGlobalUser from "../hooks/useGlobalUser";

// ─────────────────────────────────────────────────────────────────
// SECTION 1 — ICONS
// ─────────────────────────────────────────────────────────────────

const Icons = {
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
  Profile: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  ProfileFilled: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 12a5 5 0 100-10 5 5 0 000 10zM3 21a9 9 0 1118 0H3z" />
    </svg>
  ),
  Explore: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
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
  Admin: (p) => (
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
  ChevronDown: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  ),
  Menu: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="3" y1="6"  x2="21" y2="6" />
      <line x1="3" y1="12" x2="16" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),
  Close: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6"  x2="6"  y2="18" />
      <line x1="6"  y1="6"  x2="18" y2="18" />
    </svg>
  ),
  Rooms: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      <path d="M8 10h8M8 14h5" />
    </svg>
  ),
  Plus: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  Verified: (p) => (
    <svg {...p} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
};

// ─────────────────────────────────────────────────────────────────
// SECTION 2 — DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────

const T = {
  bg:           "#070707",
  glass:        "rgba(7,7,7,0.82)",
  surface:      "rgba(255,255,255,0.03)",
  surfaceHover: "rgba(255,255,255,0.055)",
  border:       "rgba(255,255,255,0.07)",
  borderGreen:  "rgba(34,197,94,0.2)",
  green:        "#22c55e",
  greenDim:     "rgba(34,197,94,0.7)",
  greenGlow:    "rgba(34,197,94,0.25)",
  greenSub:     "rgba(34,197,94,0.08)",
  text:         "#e4e4e7",
  textMuted:    "#71717a",
  textDim:      "#3f3f46",
  blur:         "blur(24px)",
  drawerW:      "288px",
};

// ─────────────────────────────────────────────────────────────────
// SECTION 3 — NAV CONFIG
// ─────────────────────────────────────────────────────────────────

/**
 * buildNavLinks — generates nav items based on authenticated user id.
 * Profile link is dynamic; all others are static.
 */
const buildNavLinks = (userId) => [
  {
    to:           "/",
    label:        "Home",
    Icon:         Icons.Home,
    IconFilled:   Icons.HomeFilled,
    badgeKey:     null,
    exact:        true,
  },
  {
    to:           "/explore",
    label:        "Explore",
    Icon:         Icons.Explore,
    IconFilled:   Icons.Explore,
    badgeKey:     null,
    exact:        false,
  },
  {
    to:           "/rooms",
    label:        "Debates",
    Icon:         Icons.Rooms,
    IconFilled:   Icons.Rooms,
    badgeKey:     "rooms",
    exact:        false,
  },
  {
    to:           "/messages",
    label:        "Messages",
    Icon:         Icons.Messages,
    IconFilled:   Icons.MessagesFilled,
    badgeKey:     "messages",
    exact:        false,
  },
  {
    to:           "/notifications",
    label:        "Alerts",
    Icon:         Icons.Bell,
    IconFilled:   Icons.BellFilled,
    badgeKey:     "notifications",
    exact:        false,
  },
  {
    to:           userId ? `/profile/${userId}` : "/profile",
    label:        "Profile",
    Icon:         Icons.Profile,
    IconFilled:   Icons.ProfileFilled,
    badgeKey:     null,
    exact:        false,
  },
];

const ADMIN_LINK = {
  to:         "/admin",
  label:      "Admin",
  Icon:       Icons.Admin,
  IconFilled: Icons.Admin,
  badgeKey:   null,
  exact:      false,
};

// Bottom bar shows first 5 only
const BOTTOM_BAR_COUNT = 5;

// ─────────────────────────────────────────────────────────────────
// SECTION 4 — ANIMATION VARIANTS
// ─────────────────────────────────────────────────────────────────

const EASE_EXPO = [0.16, 1, 0.3, 1];
const EASE_SPRING = { type: "spring", stiffness: 420, damping: 36 };

const navbarVariants = {
  visible: { y: 0,   opacity: 1, transition: { duration: 0.5,  ease: EASE_EXPO } },
  hidden:  { y: -72, opacity: 0, transition: { duration: 0.35, ease: EASE_EXPO } },
  exit:    { y: -72, opacity: 0, transition: { duration: 0.28, ease: EASE_EXPO } },
};

const dropdownVariants = {
  closed: {
    opacity: 0,
    scale:   0.95,
    y:       -6,
    transition: { duration: 0.14, ease: "easeIn" },
  },
  open: {
    opacity: 1,
    scale:   1,
    y:       0,
    transition: { duration: 0.22, ease: EASE_EXPO },
  },
};

const drawerVariants = {
  closed: {
    x:          T.drawerW,
    transition: { type: "spring", stiffness: 420, damping: 42 },
  },
  open: {
    x:          0,
    transition: { type: "spring", stiffness: 340, damping: 34, staggerChildren: 0.055, delayChildren: 0.04 },
  },
};

const drawerItemVariants = {
  closed: { opacity: 0, x: 20 },
  open:   { opacity: 1, x: 0, transition: { duration: 0.34, ease: EASE_EXPO } },
};

const overlayVariants = {
  closed: { opacity: 0, transition: { duration: 0.22 } },
  open:   { opacity: 1, transition: { duration: 0.28 } },
};

const badgeVariants = {
  initial: { scale: 0, opacity: 0 },
  animate: { scale: 1, opacity: 1, transition: { type: "spring", stiffness: 620, damping: 20 } },
  exit:    { scale: 0, opacity: 0, transition: { duration: 0.12 } },
};

const bottomBarVariants = {
  hidden:  { y: 80,  opacity: 0 },
  visible: { y: 0,   opacity: 1, transition: { duration: 0.48, ease: EASE_EXPO, delay: 0.08 } },
};

// ─────────────────────────────────────────────────────────────────
// SECTION 5 — CUSTOM HOOKS
// ─────────────────────────────────────────────────────────────────

/**
 * useScrollDirection
 * Returns 'up' | 'down'.
 * Used to auto-hide the top bar when scrolling down a feed.
 */
function useScrollDirection(threshold = 10) {
  const [direction, setDirection] = useState("up");
  const lastY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const onScroll = () => {
      if (ticking.current) {return;}
      ticking.current = true;
      requestAnimationFrame(() => {
        const y     = window.scrollY;
        const delta = y - lastY.current;
        if (y < threshold || Math.abs(delta) < threshold) {
          ticking.current = false;
          return;
        }
        setDirection(delta > 0 ? "down" : "up");
        lastY.current   = y;
        ticking.current = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return direction;
}

/**
 * useOutsideClick
 * Fires `callback` when a click/touch occurs outside `ref`.
 */
function useOutsideClick(ref, callback, enabled = true) {
  useEffect(() => {
    if (!enabled) {return;}
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {callback(e);}
    };
    document.addEventListener("mousedown",  handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown",  handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [ref, callback, enabled]);
}

/**
 * useFocusTrap
 * Traps keyboard focus inside `containerRef` when `active` is true.
 * Restores focus to the previously focused element on deactivation.
 */
function useFocusTrap(containerRef, active) {
  const previousFocus = useRef(null);

  useEffect(() => {
    if (!active) {
      previousFocus.current?.focus();
      return;
    }

    previousFocus.current = document.activeElement;

    const container = containerRef.current;
    if (!container) {return;}

    const FOCUSABLE = [
      "a[href]",
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "[tabindex]:not([tabindex='-1'])",
    ].join(",");

    const getFocusable = () => Array.from(container.querySelectorAll(FOCUSABLE));

    // Auto-focus first element
    const focusable = getFocusable();
    focusable[0]?.focus();

    const onKeyDown = (e) => {
      if (e.key !== "Tab") {return;}
      const nodes = getFocusable();
      if (!nodes.length) {return;}

      const first = nodes[0];
      const last  = nodes[nodes.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [active, containerRef]);
}

/**
 * useNavBadges
 * Subscribes to socket events that push unread counts for
 * messages, notifications, and active rooms.
 */
function useNavBadges(user) {
  const [badges, setBadges] = useState({ messages: 0, notifications: 0, rooms: 0 });

  useEffect(() => {
    if (!user) {return;}
    const socket = getSocket();

    const set = (key) => (data) =>
      setBadges((prev) => {
        const next = data.unread ?? data.active ?? 0;
        return prev[key] === next ? prev : { ...prev, [key]: next };
      });

    const onMessages      = set("messages");
    const onNotifications = set("notifications");
    const onRooms         = set("rooms");

    socket.on("badge:messages",      onMessages);
    socket.on("badge:notifications", onNotifications);
    socket.on("badge:rooms",         onRooms);

    const updateLocalBadges = () => {
      const notifs = JSON.parse(localStorage.getItem('forreal_notifications') || '[]');
      const unreadNotifs = notifs.filter(n => !n.read).length;
      setBadges(prev => {
        if (prev.notifications === unreadNotifs) {return prev;}
        return { ...prev, notifications: unreadNotifs };
      });
    };

    updateLocalBadges();
    const interval = setInterval(updateLocalBadges, 2000);
    window.addEventListener('storage', updateLocalBadges);
    window.addEventListener('local_notify', updateLocalBadges);

    return () => {
      socket.off("badge:messages",      onMessages);
      socket.off("badge:notifications", onNotifications);
      socket.off("badge:rooms",         onRooms);
      clearInterval(interval);
      window.removeEventListener('storage', updateLocalBadges);
      window.removeEventListener('local_notify', updateLocalBadges);
    };
  }, [user]);

  return badges;
}

// ─────────────────────────────────────────────────────────────────
// SECTION 6 — SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────

// ── NavLogo ────────────────────────────────────────────────────────
const NavLogo = memo(function NavLogo({ compact = false }) {
  return (
    <Link
      to="/"
      aria-label="ForReal — Home"
      className="group flex items-center gap-2.5 flex-shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-green-500/40 rounded-xl"
    >
      {/* FR wordmark — F white, R green, no icon, no background */}
      <span
        className="select-none font-black"
        style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", fontSize: "20px", letterSpacing: "-0.05em", lineHeight: "1" }}
      >
        <span style={{ color: "#FFFFFF" }}>F</span>
        <span style={{ color: T.green }}>R</span>
      </span>

      {/* Wordmark — hidden on very small or when compact=true */}
      {!compact && (
        <span
          className="hidden sm:block text-white font-black select-none"
          style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: "18px", letterSpacing: "-0.04em", lineHeight: "1" }}
        >
          FOR<span style={{ color: T.green }}>REAL</span>
        </span>
      )}
    </Link>
  );
});

// ── NavBadge ───────────────────────────────────────────────────────
const NavBadge = memo(function NavBadge({ count }) {
  if (!count || count < 1) {return null;}
  const label = count > 99 ? "99+" : String(count);

  return (
    <AnimatePresence>
      <motion.span
        key={count}
        variants={badgeVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="absolute -top-1.5 -right-1.5 min-w-[15px] h-[15px] px-[3px] rounded-full flex items-center justify-center pointer-events-none select-none"
        style={{
          background: "linear-gradient(135deg, #22c55e, #16a34a)",
          color:      "#000",
          fontSize:   "8px",
          fontWeight: 900,
          fontFamily: "'Space Mono', monospace",
          boxShadow:  `0 0 6px rgba(34,197,94,0.55), 0 0 0 1.5px ${T.bg}`,
        }}
        aria-label={`${count} unread`}
      >
        {label}
      </motion.span>
    </AnimatePresence>
  );
});

// ── LivePulse ──────────────────────────────────────────────────────
const LivePulse = memo(function LivePulse() {
  return (
    <span className="relative flex h-2 w-2 flex-shrink-0">
      <span
        className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
        style={{ background: T.green }}
      />
      <span
        className="relative inline-flex rounded-full h-2 w-2"
        style={{ background: T.green, boxShadow: `0 0 5px ${T.greenGlow}` }}
      />
    </span>
  );
});

// ── DesktopNavLink ─────────────────────────────────────────────────
const DesktopNavLink = memo(function DesktopNavLink({ item, badge = 0 }) {
  const location = useLocation();
  const isActive = item.exact
    ? location.pathname === item.to
    : location.pathname.startsWith(item.to);

  const ActiveIcon = item.IconFilled || item.Icon;
  const CurrIcon   = isActive ? ActiveIcon : item.Icon;

  return (
    <NavLink
      to={item.to}
      aria-label={item.label}
      aria-current={isActive ? "page" : undefined}
      className="group relative flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-green-500/40"
    >
      {/* Active pill */}
      {isActive && (
        <motion.div
          layoutId="navbar-desktop-pill"
          className="absolute inset-0 rounded-xl"
          style={{ background: T.greenSub, border: `1px solid ${T.borderGreen}` }}
          transition={EASE_SPRING}
        />
      )}

      {/* Hover layer */}
      {!isActive && (
        <div
          className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
          style={{ background: T.surfaceHover }}
        />
      )}

      {/* Icon */}
      <div className="relative">
        <CurrIcon
          className={`w-4 h-4 transition-all duration-200 ${
            isActive ? "text-green-400" : "text-zinc-500 group-hover:text-zinc-300"
          }`}
          style={isActive ? { filter: `drop-shadow(0 0 4px ${T.greenGlow})` } : {}}
        />
        <NavBadge count={badge} />
      </div>

      {/* Label */}
      <span
        className={`relative text-[13px] font-semibold tracking-wide transition-colors duration-200 whitespace-nowrap select-none ${
          isActive ? "text-green-400" : "text-zinc-400 group-hover:text-zinc-100"
        }`}
      >
        {item.label}
      </span>
    </NavLink>
  );
});

// ── DropdownItem ───────────────────────────────────────────────────
const DropdownItem = memo(function DropdownItem({ to, Icon, label, onClick, danger = false }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[12px] font-semibold tracking-wide transition-all duration-200 outline-none focus-visible:ring-1 focus-visible:ring-green-500/30"
      style={{ color: danger ? "#f87171" : T.textMuted }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = danger ? "rgba(239,68,68,0.07)" : T.surfaceHover;
        e.currentTarget.style.color      = danger ? "#fca5a5"              : T.text;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "";
        e.currentTarget.style.color      = danger ? "#f87171" : T.textMuted;
      }}
    >
      <Icon className={`w-[15px] h-[15px] flex-shrink-0 transition-colors duration-200 ${danger ? "text-red-400 group-hover:text-red-300" : "text-zinc-500 group-hover:text-zinc-300"}`} />
      {label}
    </Link>
  );
});

// ── UserDropdown ───────────────────────────────────────────────────
const UserDropdown = memo(function UserDropdown({ user, onLogout }) {
  const [open, setOpen]    = useState(false);
  const containerRef       = useRef(null);
  const meId               = user?._id || user?.id;
  const shouldReduceMotion = useReducedMotion();

  // Close on outside click
  const close = useCallback(() => setOpen(false), []);
  useOutsideClick(containerRef, close, open);

  // Close on Escape
  useEffect(() => {
    if (!open) {return;}
    const onKey = (e) => { if (e.key === "Escape") {setOpen(false);} };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const handleLogoutClick = useCallback(() => {
    setOpen(false);
    onLogout();
  }, [onLogout]);

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <motion.button
        whileTap={shouldReduceMotion ? {} : { scale: 0.96 }}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${user?.displayName || user?.username}`}
        className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl border transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-green-500/40"
        style={{
          background:  open ? T.greenSub         : T.surface,
          borderColor: open ? T.borderGreen       : T.border,
        }}
      >
        {/* Avatar + online dot */}
        <div className="relative flex-shrink-0">
            <img
              src={user?.avatar || `https://api.dicebear.com/7.x/shapes/svg?seed=${user?.username || "user"}`}
              alt={user?.displayName || "Your avatar"}
            className="h-7 w-7 rounded-full object-cover"
            style={{ border: `1.5px solid rgba(34,197,94,0.2)` }}
            loading="lazy"
          />
          <span
            className="absolute -bottom-0.5 -right-0.5 h-[10px] w-[10px] rounded-full"
            style={{ background: T.green, border: `2px solid ${T.bg}`, boxShadow: `0 0 5px ${T.greenGlow}` }}
            aria-label="Online"
          />
        </div>

        {/* Name + handle — visible md+ */}
        <div className="hidden md:block text-left max-w-[108px]">
          <div
            className="text-[11.5px] font-bold truncate leading-tight"
            style={{ color: T.text }}
          >
            {user?.displayName || "User"}
          </div>
          <div
            className="text-[10px] truncate leading-tight mt-[1px]"
            style={{ fontFamily: "'Space Mono', monospace", color: T.textMuted }}
          >
            @{user?.username || "setup"}
          </div>
        </div>

        {/* Chevron */}
        <Icons.ChevronDown
          className="w-3.5 h-3.5 transition-transform duration-200 hidden md:block"
          style={{ color: T.textMuted, transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </motion.button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            aria-label="Account options"
            variants={dropdownVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className="absolute right-0 top-full mt-2.5 w-56 rounded-2xl overflow-hidden z-50 origin-top-right"
            style={{
              background:     "rgba(9,9,9,0.97)",
              backdropFilter: T.blur,
              WebkitBackdropFilter: T.blur,
              border:         `1px solid ${T.border}`,
              boxShadow:      "0 20px 48px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.04)",
            }}
          >
            {/* Top glow line */}
            <div
              className="h-px w-full"
              style={{ background: "linear-gradient(to right, transparent, rgba(34,197,94,0.45), transparent)" }}
            />

            {/* Identity header */}
            <div
              className="px-4 py-3.5"
              style={{ borderBottom: `1px solid ${T.border}` }}
            >
              <div className="flex items-center gap-2.5">
                <img
                      src={user?.avatar || `https://api.dicebear.com/7.x/shapes/svg?seed=${user?.username}`}
                      alt=""
                      className="h-9 w-9 rounded-full object-cover flex-shrink-0"
                      style={{ border: `1.5px solid rgba(34,197,94,0.2)` }}
                  />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12px] font-bold text-white truncate max-w-[120px]">
                          {user?.displayName || "User"}
                        </span>
                        {user?.verified && (
                          <Icons.Verified className="w-3.5 h-3.5 flex-shrink-0" style={{ color: T.green }} />
                        )}
                  </div>
                  <div
                    className="text-[10px] truncate mt-0.5"
                    style={{ fontFamily: "'Space Mono', monospace", color: T.textMuted }}
                  >
                        @{user?.username || "setup"}
                  </div>
                </div>
              </div>
            </div>

            {/* Menu items */}
            <div className="p-1.5 space-y-0.5" role="group">
              <DropdownItem
                to={`/profile/${meId}`}
                Icon={Icons.Profile}
                label="View Profile"
                onClick={() => setOpen(false)}
              />
              <DropdownItem
                to="/settings"
                Icon={Icons.Settings}
                label="Settings"
                onClick={() => setOpen(false)}
              />
            </div>

            {/* Divider */}
            <div className="mx-3 my-1 h-px" style={{ background: T.border }} />

            {/* Sign out */}
            <div className="p-1.5">
              <motion.button
                whileTap={shouldReduceMotion ? {} : { scale: 0.97 }}
                role="menuitem"
                onClick={handleLogoutClick}
                aria-label="Sign out of your account"
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[12px] font-semibold tracking-wide text-red-400 transition-all duration-200 outline-none focus-visible:ring-1 focus-visible:ring-red-500/40"
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.07)"; e.currentTarget.style.color = "#fca5a5"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = ""; e.currentTarget.style.color = "#f87171"; }}
              >
                <Icons.LogOut className="w-[15px] h-[15px] flex-shrink-0" />
                Sign out
              </motion.button>
            </div>

            {/* Bottom padding */}
            <div className="pb-1" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// ── DrawerNavLink ──────────────────────────────────────────────────
const DrawerNavLink = memo(function DrawerNavLink({ item, badge = 0, onClick }) {
  const location = useLocation();
  const isActive = item.exact
    ? location.pathname === item.to
    : location.pathname.startsWith(item.to);

  const ActiveIcon = item.IconFilled || item.Icon;
  const CurrIcon   = isActive ? ActiveIcon : item.Icon;

  return (
    <motion.div variants={drawerItemVariants}>
      <NavLink
        to={item.to}
        onClick={onClick}
        aria-label={item.label}
        aria-current={isActive ? "page" : undefined}
        className="group relative flex items-center gap-4 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 border outline-none focus-visible:ring-2 focus-visible:ring-green-500/40"
        style={
          isActive
            ? { background: T.greenSub, borderColor: T.borderGreen, color: T.green }
            : { borderColor: "transparent", color: T.textMuted }
        }
        onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = T.surfaceHover; e.currentTarget.style.color = T.text; } }}
        onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = ""; e.currentTarget.style.color = T.textMuted; } }}
      >
        {/* Left accent bar */}
        {isActive && (
          <motion.div
            layoutId="drawer-active-bar"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full"
            style={{ background: T.green, boxShadow: `0 0 10px ${T.greenGlow}` }}
            transition={EASE_SPRING}
          />
        )}

        {/* Icon + badge */}
        <div className="relative flex-shrink-0">
          <CurrIcon
            className="w-5 h-5 transition-colors duration-200"
            style={isActive ? { filter: `drop-shadow(0 0 5px ${T.greenGlow})` } : {}}
          />
          <NavBadge count={badge} />
        </div>

        {/* Label */}
        <span className="relative flex-1 tracking-wide select-none">{item.label}</span>

        {/* Badge count text */}
        {badge > 0 && (
          <span
            className="text-[10px] font-bold"
            style={{ fontFamily: "'Space Mono', monospace", color: isActive ? T.greenDim : T.textDim }}
          >
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </NavLink>
    </motion.div>
  );
});

// ── MobileDrawer ───────────────────────────────────────────────────
const MobileDrawer = memo(function MobileDrawer({
  open,
  onClose,
  navLinks,
  isAdmin,
  badges,
  user,
  onLogout,
}) {
  const drawerRef      = useRef(null);
  const meId           = user?._id || user?.id;
  const shouldReduceMotion = useReducedMotion();

  // Focus trap
  useFocusTrap(drawerRef, open);

  // Escape key
  useEffect(() => {
    if (!open) {return;}
    const onKey = (e) => { if (e.key === "Escape") {onClose();} };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Prevent body scroll while drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const handleLogoutClick = useCallback(() => {
    onClose();
    onLogout();
  }, [onClose, onLogout]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            variants={overlayVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(5px)", WebkitBackdropFilter: "blur(5px)" }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer panel */}
          <motion.aside
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            variants={shouldReduceMotion ? {} : drawerVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className="fixed top-0 right-0 bottom-0 z-50 flex flex-col overflow-hidden"
            style={{
              width:          T.drawerW,
              background:     "rgba(6,6,6,0.99)",
              backdropFilter: T.blur,
              WebkitBackdropFilter: T.blur,
              borderLeft:     `1px solid ${T.border}`,
              boxShadow:      "-20px 0 60px rgba(0,0,0,0.6)",
            }}
          >
            {/* Top glow line */}
            <div
              className="absolute top-0 left-0 right-0 h-px"
              style={{ background: "linear-gradient(to right, transparent, rgba(34,197,94,0.4), transparent)" }}
              aria-hidden="true"
            />

            {/* Drawer header */}
            <motion.div
              variants={drawerItemVariants}
              className="flex items-center justify-between px-5 py-4 flex-shrink-0"
              style={{ borderBottom: `1px solid ${T.border}` }}
            >
              <NavLogo />
              <motion.button
                whileTap={shouldReduceMotion ? {} : { scale: 0.88 }}
                onClick={onClose}
                aria-label="Close navigation menu"
                className="p-2 rounded-xl transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-green-500/40"
                style={{ color: T.textMuted, background: T.surface, border: `1px solid ${T.border}` }}
                onMouseEnter={(e) => { e.currentTarget.style.color = T.text; e.currentTarget.style.background = T.surfaceHover; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = T.textMuted; e.currentTarget.style.background = T.surface; }}
              >
                <Icons.Close className="w-4.5 h-4.5" />
              </motion.button>
            </motion.div>

            {/* User identity panel */}
            {user && (
              <motion.div
                variants={drawerItemVariants}
                className="mx-3 mt-3 flex-shrink-0 rounded-2xl p-3.5"
                style={{ background: T.surface, border: `1px solid ${T.border}` }}
              >
                <Link
                  to={`/profile/${meId}`}
                  onClick={onClose}
                  className="flex items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-green-500/40 rounded-xl"
                  aria-label={`View ${user?.displayName}'s profile`}
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={user?.avatar || `https://api.dicebear.com/7.x/shapes/svg?seed=${user?.username}`}
                      alt={user?.displayName || "Your avatar"}
                      className="h-11 w-11 rounded-full object-cover"
                      style={{ border: `2px solid rgba(34,197,94,0.2)` }}
                      loading="lazy"
                    />
                    <span
                      className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full"
                      style={{ background: T.green, border: `2px solid rgba(6,6,6,1)`, boxShadow: `0 0 6px ${T.greenGlow}` }}
                      aria-label="Online"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-bold text-white truncate">{user.displayName || "User"}</span>
                      {user.verified && <Icons.Verified className="w-3.5 h-3.5 flex-shrink-0" style={{ color: T.green }} />}
                    </div>
                    <span
                      className="text-[11px] truncate block mt-0.5"
                      style={{ fontFamily: "'Space Mono', monospace", color: T.textMuted }}
                    >
                      @{user.username || "setup"}
                    </span>
                  </div>
                </Link>
              </motion.div>
            )}

            {/* Scrollable nav */}
            <nav
              className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5 overscroll-contain"
              aria-label="Drawer navigation"
            >
              {navLinks.map((link) => (
                <DrawerNavLink
                  key={link.to}
                  item={link}
                  badge={badges[link.badgeKey] || 0}
                  onClick={onClose}
                />
              ))}

              {isAdmin && (
                <DrawerNavLink
                  item={ADMIN_LINK}
                  badge={0}
                  onClick={onClose}
                />
              )}

              {/* New debate CTA inside drawer */}
              <motion.div variants={drawerItemVariants} className="pt-2">
                <Link
                  to="/rooms"
                  onClick={onClose}
                  aria-label="Start a new debate"
                  className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-2xl text-[11px] font-bold tracking-widest transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-green-500/40"
                  style={{
                    background: T.greenSub,
                    border:     `1px solid ${T.borderGreen}`,
                    color:      T.green,
                    fontFamily: "'Space Mono', monospace",
                  }}
                >
                  <Icons.Plus className="w-3.5 h-3.5" />
                  NEW DEBATE
                </Link>
              </motion.div>
            </nav>

            {/* Footer — sign out */}
            <motion.div
              variants={drawerItemVariants}
              className="px-3 py-4 flex-shrink-0"
              style={{ borderTop: `1px solid ${T.border}` }}
            >
              <motion.button
                whileTap={shouldReduceMotion ? {} : { scale: 0.97 }}
                onClick={handleLogoutClick}
                aria-label="Sign out of your account"
                className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-2xl text-[12px] font-bold tracking-wide transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-red-500/40"
                style={{
                  color:      "#f87171",
                  border:     "1px solid rgba(239,68,68,0.15)",
                  background: "rgba(239,68,68,0.04)",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.04)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.15)"; }}
              >
                <Icons.LogOut className="w-4 h-4" />
                Sign out
              </motion.button>

              {/* Brand stamp */}
              <p
                className="mt-3 text-center text-[9px] tracking-[0.2em] select-none"
                style={{ fontFamily: "'Space Mono', monospace", color: T.textDim }}
              >
                FORREAL · WE DON'T TALK SHIT
              </p>
            </motion.div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
});

// ── MobileBottomBar ────────────────────────────────────────────────
const MobileBottomBar = memo(function MobileBottomBar({ navLinks, badges }) {
  const location           = useLocation();
  const shouldReduceMotion = useReducedMotion();
  const bottomLinks        = navLinks.slice(0, BOTTOM_BAR_COUNT);

  return (
    <motion.nav
      role="navigation"
      aria-label="Mobile bottom navigation"
      variants={bottomBarVariants}
      initial={shouldReduceMotion ? "visible" : "hidden"}
      animate="visible"
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden"
      style={{
        background:          T.glass,
        backdropFilter:      T.blur,
        WebkitBackdropFilter: T.blur,
        borderTop:           `1px solid ${T.border}`,
        paddingBottom:       "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {/* Top hairline accent */}
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: "linear-gradient(to right, transparent, rgba(34,197,94,0.2), transparent)" }}
        aria-hidden="true"
      />

      <div className="flex items-center justify-around px-1 py-1.5">
        {bottomLinks.map((item) => {
          const isActive   = item.exact
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);

          const ActiveIcon = item.IconFilled || item.Icon;
          const CurrIcon   = isActive ? ActiveIcon : item.Icon;
          const badge      = badges[item.badgeKey] || 0;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              className="relative flex flex-col items-center gap-[3px] px-3 py-2 rounded-xl transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-green-500/40 min-w-[52px]"
            >
              {/* Active bg pill */}
              <AnimatePresence>
                {isActive && !shouldReduceMotion && (
                  <motion.div
                    layoutId="bottombar-active-pill"
                    className="absolute inset-0 rounded-xl"
                    style={{ background: T.greenSub, border: `1px solid ${T.borderGreen}` }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={EASE_SPRING}
                  />
                )}
              </AnimatePresence>

              {/* Icon + badge */}
              <div className="relative">
                <CurrIcon
                  className={`relative w-5 h-5 transition-all duration-200 ${isActive ? "text-green-400" : "text-zinc-500"}`}
                  style={isActive ? { filter: `drop-shadow(0 0 5px ${T.greenGlow})` } : {}}
                />
                <NavBadge count={badge} />
              </div>

              {/* Label */}
              <span
                className={`relative text-[8px] font-bold tracking-[0.1em] uppercase select-none transition-colors duration-200 ${
                  isActive ? "text-green-400" : "text-zinc-600"
                }`}
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

// ─────────────────────────────────────────────────────────────────
// SECTION 7 — MAIN NAVBAR (DEFAULT EXPORT)
// ─────────────────────────────────────────────────────────────────

export default function Navbar() {
  const { user, logout }     = useContext(AuthContext) || { user: null, logout: () => {} };
  const globalUser           = useGlobalUser(); // Subscribe to global user updates (avatar, etc.)
  // Use global user for display to ensure avatar updates propagate everywhere
  const displayUser          = globalUser.user || user;
  const navigate             = useNavigate();
  const shouldReduceMotion   = useReducedMotion();

  // ── State ──────────────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen] = useState(false);

  // ── Derived values ─────────────────────────────────────────────
  const userId = displayUser?._id || displayUser?.id;

  const navLinks = useMemo(
    () => buildNavLinks(userId),
    [userId]
  );

  const isAdmin = useMemo(
    () => displayUser?.role === "admin",
    [displayUser?.role]
  );

  // ── Hooks ──────────────────────────────────────────────────────
  const scrollDirection = useScrollDirection(16);
  const badges          = useNavBadges(displayUser);

  // ── Handlers ──────────────────────────────────────────────────
  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
    }
  }, [logout, navigate]);

  const openDrawer  = useCallback(() => setDrawerOpen(true),  []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  // ── Render ────────────────────────────────────────────────────
  return (
    <>
      {/* ══════════════════════════════════════════════
          TOP NAVIGATION BAR
      ══════════════════════════════════════════════ */}
      <motion.nav
        role="navigation"
        aria-label="ForReal top navigation"
        variants={navbarVariants}
        initial={shouldReduceMotion ? "visible" : "hidden"}
        animate={scrollDirection === "down" && !drawerOpen ? "exit" : "visible"}
        className="sticky top-0 z-40"
        style={{
          background:          T.glass,
          backdropFilter:      T.blur,
          WebkitBackdropFilter: T.blur,
          borderBottom:        `1px solid ${T.border}`,
          boxShadow:           "0 1px 32px rgba(0,0,0,0.35)",
        }}
      >
        {/* Top neon accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-px pointer-events-none"
          style={{ background: "linear-gradient(to right, transparent 0%, rgba(34,197,94,0.5) 50%, transparent 100%)" }}
          aria-hidden="true"
        />

        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex items-center h-[54px] gap-3">

            {/* Logo — always visible */}
            <NavLogo />

            {/* ── Desktop center nav ── */}
            <nav
              className="hidden md:flex items-center gap-0.5 mx-auto"
              aria-label="Primary desktop navigation"
            >
              {navLinks.map((item) => (
                <DesktopNavLink
                  key={item.to}
                  item={item}
                  badge={badges[item.badgeKey] || 0}
                />
              ))}
              {isAdmin && (
                <DesktopNavLink item={ADMIN_LINK} badge={0} />
              )}
            </nav>

            {/* ── Desktop right — CTA + user dropdown ── */}
            <div className="hidden md:flex items-center gap-2.5 ml-auto flex-shrink-0">
              {/* New debate CTA */}
              <Link
                to="/rooms"
                aria-label="Start a new debate"
                className="group flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[11px] font-bold tracking-widest transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-green-500/40"
                style={{
                  background: T.greenSub,
                  border:     `1px solid ${T.borderGreen}`,
                  color:      T.green,
                  fontFamily: "'Space Mono', monospace",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(34,197,94,0.13)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = T.greenSub; }}
              >
                <Icons.Plus className="w-3 h-3" />
                DEBATE
              </Link>

              {/* User dropdown — only when authenticated */}
              {user && (
                <UserDropdown user={user} onLogout={handleLogout} />
              )}
            </div>

            {/* ── Mobile right — notification badge + avatar + hamburger ── */}
            <div
              className="flex md:hidden items-center gap-2 ml-auto flex-shrink-0"
              aria-label="Mobile quick actions"
            >
              {/* Notification icon with badge */}
              <NavLink
                to="/notifications"
                aria-label={`Notifications${badges.notifications ? ` — ${badges.notifications} unread` : ""}`}
                className="relative p-2 rounded-xl transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-green-500/40"
                style={{ color: T.textMuted }}
                onMouseEnter={(e) => (e.currentTarget.style.color = T.text)}
                onMouseLeave={(e) => (e.currentTarget.style.color = T.textMuted)}
              >
                <Icons.Bell className="w-5 h-5" />
                <NavBadge count={badges.notifications} />
              </NavLink>

              {/* Avatar shortcut */}
              {user && (
                <NavLink
                  to={`/profile/${userId}`}
                  aria-label="Your profile"
                  className="relative flex-shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-green-500/40"
                >
                  <img
                    src={user.avatar || `https://api.dicebear.com/7.x/shapes/svg?seed=${user.username}`}
                    alt={user.displayName || "Your avatar"}
                    className="h-8 w-8 rounded-full object-cover"
                    style={{ border: `1.5px solid rgba(34,197,94,0.22)` }}
                    loading="lazy"
                  />
                  {/* Online dot */}
                  <span
                    className="absolute -bottom-0.5 -right-0.5 h-[10px] w-[10px] rounded-full"
                    style={{ background: T.green, border: `2px solid ${T.bg}`, boxShadow: `0 0 4px ${T.greenGlow}` }}
                    aria-hidden="true"
                  />
                </NavLink>
              )}

              {/* Hamburger */}
              <motion.button
                whileTap={shouldReduceMotion ? {} : { scale: 0.9 }}
                onClick={openDrawer}
                aria-label="Open navigation menu"
                aria-expanded={drawerOpen}
                aria-controls="mobile-drawer"
                className="p-2 rounded-xl transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-green-500/40"
                style={{
                  color:      T.textMuted,
                  background: T.surface,
                  border:     `1px solid ${T.border}`,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = T.text; e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = T.textMuted; e.currentTarget.style.borderColor = T.border; }}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {drawerOpen ? (
                    <motion.span
                      key="close"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0,   opacity: 1 }}
                      exit={{ rotate: 90,    opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="block"
                    >
                      <Icons.Close className="w-5 h-5" />
                    </motion.span>
                  ) : (
                    <motion.span
                      key="menu"
                      initial={{ rotate: 90,  opacity: 0 }}
                      animate={{ rotate: 0,   opacity: 1 }}
                      exit={{ rotate: -90,  opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="block"
                    >
                      <Icons.Menu className="w-5 h-5" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>

          </div>
        </div>
      </motion.nav>

      {/* ══════════════════════════════════════════════
          MOBILE DRAWER
      ══════════════════════════════════════════════ */}
      <MobileDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        navLinks={navLinks}
        isAdmin={isAdmin}
        badges={badges}
        user={user}
        onLogout={handleLogout}
      />

      {/* ══════════════════════════════════════════════
          MOBILE BOTTOM BAR
      ══════════════════════════════════════════════ */}
      <MobileBottomBar navLinks={navLinks} badges={badges} />
    </>
  );
}