import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Outlet, Navigate, NavLink, Link, useNavigate } from 'react-router-dom';
import useAuthStore from '@/store/useAuthStore';
import { Loader } from '@/components';
import { 
  Home, 
  Compass, 
  Scale, 
  MessageCircle, 
  Bell, 
  User,
  Settings,
  LogOut,
  ChevronUp
} from 'lucide-react';

const navItems = [
  { to: '/home', icon: Home,          label: 'Home'          },
  { to: '/explore', icon: Compass,    label: 'Explore'       },
  { to: '/debates', icon: Scale,      label: 'Debates'       },
  { to: '/messages', icon: MessageCircle, label: 'Messages'  },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
];

const mobileNavItems = [
  { to: '/home',     icon: Home,          label: 'Home'     },
  { to: '/explore',  icon: Compass,       label: 'Explore'  },
  { to: '/debates',  icon: Scale,         label: 'Debates'  },
  { to: '/messages', icon: MessageCircle, label: 'Messages' },
];

export const MainLayout = () => {
  const { isAuthenticated, isLoading, logout, user } = useAuthStore();
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const accountMenuRef = useRef(null);
  const navigate = useNavigate();

  // Close account menu on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target)) {
        setShowAccountMenu(false);
      }
    };
    if (showAccountMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAccountMenu]);

  if (isLoading) return <Loader fullScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const handleLogout = async () => {
    setShowAccountMenu(false);
    await logout();
    navigate('/login', { replace: true });
  };

  const userInitial = user?.username?.[0]?.toUpperCase() || '?';
  const profilePath = `/profile/${user?.username}`;

  return (
    <div className="min-h-screen bg-bg-dark flex justify-center">
      
      {/* ── Desktop / Tablet Sidebar ─────────────────────────────── */}
      <aside className="hidden md:flex w-[72px] lg:w-60 xl:w-64 border-r border-border-subtle flex-col py-4 px-3 lg:px-4 sticky top-0 h-screen overflow-y-auto z-30 shrink-0 bg-bg-dark">
        
        {/* Wordmark */}
        <div className="mb-8 flex items-center justify-center lg:justify-start px-2 lg:px-3">
          <Link to="/home" className="font-black tracking-tight text-2xl leading-none">
            <span className="text-white hidden lg:inline">For</span>
            <span className="text-primary hidden lg:inline">Real</span>
            {/* Collapsed monogram */}
            <span className="text-primary lg:hidden text-2xl font-black">FR</span>
          </Link>
        </div>
        
        {/* Nav items */}
        <nav className="flex-1 flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `
                group flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-all duration-150
                ${isActive 
                  ? 'bg-white/[0.06] text-white' 
                  : 'text-text-muted hover:text-white hover:bg-white/[0.04]'
                }
              `}
            >
              {({ isActive }) => (
                <>
                  <div className="relative flex items-center justify-center shrink-0">
                    {/* Crimson accent bar */}
                    {isActive && (
                      <div className="absolute -left-3 w-0.5 h-5 bg-primary rounded-r-full" />
                    )}
                    <item.icon 
                      size={22} 
                      strokeWidth={isActive ? 2.5 : 2} 
                      className={isActive ? 'text-primary' : 'text-text-muted group-hover:text-white transition-colors'}
                    />
                  </div>
                  <span className="hidden lg:block text-[15px] font-medium">
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}

          {/* Profile nav item */}
          <NavLink
            to={profilePath}
            className={({ isActive }) => `
              group flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-all duration-150
              ${isActive 
                ? 'bg-white/[0.06] text-white' 
                : 'text-text-muted hover:text-white hover:bg-white/[0.04]'
              }
            `}
          >
            {({ isActive }) => (
              <>
                <div className="relative flex items-center justify-center shrink-0">
                  {isActive && (
                    <div className="absolute -left-3 w-0.5 h-5 bg-primary rounded-r-full" />
                  )}
                  <User 
                    size={22} 
                    strokeWidth={isActive ? 2.5 : 2} 
                    className={isActive ? 'text-primary' : 'text-text-muted group-hover:text-white transition-colors'}
                  />
                </div>
                <span className="hidden lg:block text-[15px] font-medium">Profile</span>
              </>
            )}
          </NavLink>
        </nav>

        {/* Account area */}
        <div className="mt-4 relative" ref={accountMenuRef}>
          {/* Account popup menu */}
          {showAccountMenu && (
            <div className="absolute bottom-full left-0 w-full mb-2 bg-[#1a1a1a] border border-border-subtle rounded-xl shadow-xl overflow-hidden z-50">
              <Link 
                to={profilePath}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-white hover:bg-white/5 transition-colors"
                onClick={() => setShowAccountMenu(false)}
              >
                <User size={16} className="text-text-muted shrink-0" />
                <span>View Profile</span>
              </Link>
              <Link 
                to="/settings" 
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-white hover:bg-white/5 transition-colors border-t border-border-subtle/50"
                onClick={() => setShowAccountMenu(false)}
              >
                <Settings size={16} className="text-text-muted shrink-0" />
                <span>Settings</span>
              </Link>
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-error hover:bg-error/10 transition-colors border-t border-border-subtle/50"
              >
                <LogOut size={16} className="shrink-0" />
                <span>Logout</span>
              </button>
            </div>
          )}
          
          {/* Account trigger button */}
          <button 
            onClick={() => setShowAccountMenu(prev => !prev)}
            className="w-full flex items-center justify-center lg:justify-between gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors border border-transparent hover:border-border-subtle/50 group"
            aria-label="Account menu"
            aria-expanded={showAccountMenu}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary shrink-0 text-sm border border-primary/20">
                {userInitial}
              </div>
              <div className="hidden lg:block min-w-0 text-left">
                <p className="text-sm font-semibold text-white truncate max-w-[120px]">
                  {user?.displayName || user?.username}
                </p>
                <p className="text-xs text-text-muted truncate max-w-[120px]">
                  @{user?.username}
                </p>
              </div>
            </div>
            <ChevronUp 
              size={16} 
              className={`text-text-muted hidden lg:block shrink-0 transition-transform duration-200 ${showAccountMenu ? 'rotate-180' : ''}`} 
            />
          </button>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-h-screen min-w-0 border-r border-border-subtle md:max-w-[680px] lg:max-w-[760px]">
        
        {/* Mobile top bar */}
        <header className="md:hidden sticky top-0 z-40 border-b border-border-subtle bg-bg-dark/90 backdrop-blur-xl px-4 py-3 flex items-center justify-between">
          <Link to="/home" className="font-black tracking-tight text-xl">
            <span className="text-white">For</span>
            <span className="text-primary">Real</span>
          </Link>
          <div className="flex items-center gap-3">
            <NavLink 
              to="/notifications" 
              className={({ isActive }) => `p-1.5 rounded-full transition-colors ${isActive ? 'text-primary' : 'text-text-muted hover:text-white'}`}
              aria-label="Notifications"
            >
              <Bell size={22} strokeWidth={2} />
            </NavLink>
            <NavLink 
              to={profilePath}
              className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-sm border border-primary/20"
              aria-label="Profile"
            >
              {userInitial}
            </NavLink>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 w-full px-4 pt-5 pb-24 md:pb-8 md:px-6 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={window.location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
        
        {/* Mobile bottom navigation */}
        <nav 
          className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border-subtle bg-bg-dark/95 backdrop-blur-xl"
          aria-label="Primary navigation"
        >
          <div className="flex justify-around px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            {mobileNavItems.map((item) => (
              <NavLink 
                key={item.to} 
                to={item.to} 
                className={({ isActive }) => `
                  flex flex-col items-center justify-center p-2 rounded-xl min-w-[48px] transition-colors
                  ${isActive ? 'text-primary' : 'text-text-muted'}
                `}
                aria-label={item.label}
              >
                {({ isActive }) => (
                  <item.icon 
                    size={24} 
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                )}
              </NavLink>
            ))}
            {/* Profile in mobile nav */}
            <NavLink 
              to={profilePath}
              className={({ isActive }) => `
                flex flex-col items-center justify-center p-2 rounded-xl min-w-[48px] transition-colors
                ${isActive ? 'text-primary' : 'text-text-muted'}
              `}
              aria-label="Profile"
            >
              {({ isActive }) => (
                <User size={24} strokeWidth={isActive ? 2.5 : 2} />
              )}
            </NavLink>
          </div>
        </nav>
      </main>

      {/* ── Right Rail (xl+) ─────────────────────────────────────── */}
      <aside className="hidden xl:flex w-72 2xl:w-80 flex-col py-6 px-5 sticky top-0 h-screen overflow-y-auto shrink-0 gap-4">
        {/* ForReal identity card */}
        <div className="bg-card-dark border border-border-subtle rounded-xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
          <p className="text-xs font-black tracking-[0.2em] text-primary uppercase mb-2">ForReal Logic Engine</p>
          <p className="text-sm font-bold text-white leading-snug">
            TRUTH. LOGIC. DEBATE.
          </p>
          <p className="text-xs text-text-muted mt-2 leading-relaxed">
            The world's premium AI-powered debate platform. We don't talk shit. We analyze it.
          </p>
        </div>

        {/* Quick links */}
        <div className="bg-card-dark border border-border-subtle rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border-subtle">
            <p className="text-xs font-bold text-text-muted uppercase tracking-wider">Navigate</p>
          </div>
          {[
            { to: '/explore', label: 'Explore', desc: 'Find what\'s real' },
            { to: '/debates', label: 'Debates', desc: 'Pick a side' },
            { to: '/settings', label: 'Settings', desc: 'Your preferences' },
          ].map(link => (
            <Link 
              key={link.to}
              to={link.to}
              className="flex flex-col px-4 py-3 hover:bg-white/[0.03] border-b border-border-subtle/50 last:border-b-0 transition-colors"
            >
              <span className="text-sm font-medium text-white">{link.label}</span>
              <span className="text-xs text-text-muted">{link.desc}</span>
            </Link>
          ))}
        </div>
      </aside>
    </div>
  );
};
