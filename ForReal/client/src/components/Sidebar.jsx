import React, { useCallback, useContext } from 'react';
import PropTypes from 'prop-types';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home,
  MessageSquare,
  Settings,
  PlusCircle,
  Bell,
  Compass,
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

// -----------------------------------------------------------------------------
// Animation Variants – reusable motion presets
// -----------------------------------------------------------------------------

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
      type: 'spring',
      stiffness: 80,
      damping: 20,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -16, scale: 0.98 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
};

const mobileBarVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.35, ease: 'easeOut' },
  },
};

// -----------------------------------------------------------------------------
// Helper: Skeleton Pulse Component (reusable)
// -----------------------------------------------------------------------------

const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse rounded-lg bg-white/5 ${className}`} />
);

// -----------------------------------------------------------------------------
// Menu Configuration
// -----------------------------------------------------------------------------

const menuItems = [
  { label: 'Home', path: '/', icon: Home, end: true },
  { label: 'Explore', path: '/explore', icon: Compass },
  { label: 'Messages', path: '/messages', icon: MessageSquare, badgeKey: 'unreadMessages' },
  { label: 'Notifications', path: '/notifications', icon: Bell, badgeKey: 'notifications' },
  { label: 'Settings', path: '/settings', icon: Settings },
];

// -----------------------------------------------------------------------------
// Subcomponent: DesktopSidebar
// -----------------------------------------------------------------------------

const DesktopSidebar = React.memo(({ user, isLoading, onNewDebate }) => {
  return (
    <aside
      className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:w-72 z-30"
      aria-label="Main navigation"
    >
      <div className="flex flex-col flex-1 min-h-0 bg-black/40 backdrop-blur-2xl border-r border-white/10 shadow-2xl">
        {/* Branding */}
        <div className="flex items-center h-16 px-6 mt-2 mb-6">
          <div className="text-2xl font-black tracking-tighter text-brand">
            ForReal
          </div>
          <div className="ml-2 w-1.5 h-1.5 rounded-full bg-brand shadow-glow-sm" />
        </div>

        {/* New Debate Button */}
        <div className="px-4 mb-4">
          <button
            type="button"
            onClick={onNewDebate}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-brand text-white font-semibold text-sm hover:bg-brand/90 active:scale-[0.98] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand/50"
            aria-label="Start a new debate"
          >
            <PlusCircle className="w-5 h-5" />
            New Debate
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1.5" role="navigation" aria-label="Primary">
          {isLoading ? (
            // Skeleton loading state
            <>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3">
                  <Skeleton className="w-5 h-5 rounded-md" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </>
          ) : (
            <motion.ul
              initial="hidden"
              animate="visible"
              variants={containerVariants}
              className="space-y-1.5"
            >
              {menuItems.map((item) => (
                <motion.li key={item.path} variants={itemVariants}>
                  <NavLink
                    to={item.path}
                    end={item.end}
                    className={({ isActive }) =>
                      `flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-brand/50 ${
                        isActive
                          ? 'bg-brand/10 text-brand border border-brand/30 shadow-glow-sm'
                          : 'text-gray-400 hover:text-brand hover:bg-white/5 border border-transparent'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon
                          className={`w-5 h-5 transition-transform duration-200 ${
                            isActive ? 'text-brand scale-110' : 'text-current'
                          }`}
                          strokeWidth={isActive ? 2 : 1.7}
                          aria-hidden="true"
                        />
                        <span>{item.label}</span>

                        {/* Badge for messages / notifications */}
                        {!isLoading && item.badgeKey && user?.[item.badgeKey] > 0 && (
                          <span className="ml-auto flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold bg-brand text-white rounded-full shadow-glow-sm">
                            {user[item.badgeKey]}
                          </span>
                        )}

                        {/* Active glow dot (optional) */}
                        {isActive && item.badgeKey && user?.[item.badgeKey] > 0 ? null : (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-brand/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </>
                    )}
                  </NavLink>
                </motion.li>
              ))}
            </motion.ul>
          )}
        </nav>

        {/* User Badge / Footer */}
        <div className="p-4 mt-auto border-t border-white/5">
          {isLoading ? (
            <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-white/5">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-2 w-12" />
              </div>
            </div>
          ) : user ? (
            <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-white/5 backdrop-blur-sm">
              <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.displayName || user.username || 'U'}&background=0F0F0F&color=22c55e&bold=true`} alt="Avatar" className="w-8 h-8 rounded-full border border-brand/30 object-cover bg-black" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-brand truncate">{user.displayName}</p>
                <p className="text-[10px] text-gray-400 truncate">@{user.username}</p>
              </div>
              <div className="w-2 h-2 rounded-full bg-brand shadow-glow-sm" />
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
});

DesktopSidebar.displayName = 'DesktopSidebar';

// -----------------------------------------------------------------------------
// Subcomponent: MobileBottomBar
// -----------------------------------------------------------------------------

const MobileBottomBar = React.memo(({ user, isLoading }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden" aria-label="Mobile navigation">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={mobileBarVariants}
        className="bg-black/70 backdrop-blur-xl border-t border-white/10 shadow-2xl"
      >
        <nav className="flex justify-around items-center px-2 py-2" role="navigation">
          {isLoading
            ? // Skeleton loading – simple pulsing circles
              [...Array(5)].map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-1 py-2 px-4">
                  <Skeleton className="w-5 h-5 rounded-md" />
                  <Skeleton className="h-2 w-12" />
                </div>
              ))
            : menuItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) =>
                    `relative flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand/50 ${
                      isActive
                        ? 'text-brand bg-brand/10'
                        : 'text-gray-400 hover:text-brand hover:bg-white/5'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon
                        className={`w-5 h-5 transition-transform duration-200 ${
                          isActive ? 'scale-110' : 'scale-100'
                        }`}
                        strokeWidth={isActive ? 2 : 1.7}
                        aria-hidden="true"
                      />
                      <span className="text-[10px] font-medium">{item.label}</span>

                      {/* Badge for messages / notifications */}
                      {item.badgeKey && user?.[item.badgeKey] > 0 && (
                        <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-4 px-1 text-[9px] font-bold bg-brand text-white rounded-full shadow-glow-sm">
                          {user[item.badgeKey]}
                        </span>
                      )}

                      {/* Active indicator */}
                      {isActive && (
                        <motion.div
                          layoutId="mobileActiveTab"
                          className="absolute -top-[2px] w-8 h-0.5 rounded-full bg-brand shadow-glow-sm"
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
        </nav>
      </motion.div>
    </div>
  );
});

MobileBottomBar.displayName = 'MobileBottomBar';

// -----------------------------------------------------------------------------
// Main Sidebar Component
// -----------------------------------------------------------------------------

/**
 * Premium production‑grade sidebar component.
 *
 * Features:
 * - Staggered mount animations
 * - Loading skeleton states
 * - Responsive: desktop fixed sidebar + mobile bottom bar
 * - Accessible navigation with ARIA roles
 * - Realtime‑ready user data via custom hook
 * - Framer Motion layout animations for active tab indicator
 */
const Sidebar = ({ onNewDebate }) => {
  const { user, loading: isLoading } = useContext(AuthContext) || {};

  // Memoize callback to prevent unnecessary re-renders
  const handleNewDebate = useCallback(() => {
    if (typeof onNewDebate === 'function') {
      onNewDebate();
    }
  }, [onNewDebate]);

  return (
    <>
      <DesktopSidebar user={user} isLoading={isLoading} onNewDebate={handleNewDebate} />
      <MobileBottomBar user={user} isLoading={isLoading} />
    </>
  );
};

Sidebar.propTypes = {
  /** Callback fired when the "New Debate" button is clicked */
  onNewDebate: PropTypes.func,
};

Sidebar.defaultProps = {
  onNewDebate: undefined,
};

export default React.memo(Sidebar);