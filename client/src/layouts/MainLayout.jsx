import React, { Suspense, useEffect, useRef, useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Scale, Newspaper, Compass, MessageCircle, Bell, User, Settings, LogOut, Plus, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '@/store/useAuthStore';
import useNotificationStore from '@/store/useNotificationStore';
import { useSocketEvent } from '@/hooks/useSocketEvent';
import { Avatar, Button, ErrorBoundary, Loader, SkeletonList, Wordmark } from '@/components/ui';
import { displayName } from '@/lib/format';
import { describeNotification } from '@/lib/notifications';

const NAV = [
  { to: '/debates', icon: Scale, label: 'Debates' },
  { to: '/home', icon: Newspaper, label: 'Feed' },
  { to: '/explore', icon: Compass, label: 'Explore' },
  { to: '/messages', icon: MessageCircle, label: 'Messages' },
  { to: '/notifications', icon: Bell, label: 'Notifications', badge: true },
];

const Badge = ({ count, className = '' }) =>
  count > 0 ? (
    <span className={`tabular inline-flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-ink bg-ivory px-1 text-[10px] font-extrabold text-ink ${className}`}>
      {count > 99 ? '99+' : count}
      <span className="sr-only"> unread</span>
    </span>
  ) : null;

const AccountMenu = ({ user, onLogout }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (e.type === 'keydown' && e.key !== 'Escape') return;
      if (e.type === 'mousedown' && ref.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  const item = 'flex w-full items-center gap-2.5 rounded-[3px] px-3 py-2.5 text-sm font-semibold hover:bg-ember';

  return (
    <div ref={ref} className="relative">
      {open && (
        <div role="menu" className="card absolute bottom-full left-0 right-0 mb-2 p-1 animate-pop shadow-hard-sm">
          <Link role="menuitem" to={`/profile/${user?.username}`} className={item} onClick={() => setOpen(false)}>
            <User size={16} /> Profile
          </Link>
          <Link role="menuitem" to="/settings" className={item} onClick={() => setOpen(false)}>
            <Settings size={16} /> Settings
          </Link>
          <button role="menuitem" type="button" className={item} onClick={() => { setOpen(false); onLogout(); }}>
            <LogOut size={16} /> Sign out
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 rounded-[4px] border-2 border-transparent p-2 hover:border-ink lg:justify-between"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
      >
        <span className="flex min-w-0 items-center gap-3">
          <Avatar src={user?.profile?.avatar} username={user?.username} size="md" />
          <span className="hidden min-w-0 text-left lg:block">
            <span className="block truncate text-sm font-extrabold">{displayName(user)}</span>
            <span className="block truncate text-xs font-semibold">@{user?.username}</span>
          </span>
        </span>
        <ChevronUp size={16} strokeWidth={2.5} className={`hidden shrink-0 transition-transform lg:block ${open ? '' : 'rotate-180'}`} />
      </button>
    </div>
  );
};

export const MainLayout = () => {
  const user = useAuthStore((s) => s.user);
  const status = useAuthStore((s) => s.status);
  const logout = useAuthStore((s) => s.logout);
  const unread = useNotificationStore((s) => s.unreadCount);
  const fetchUnreadCount = useNotificationStore((s) => s.fetchUnreadCount);
  const incrementUnread = useNotificationStore((s) => s.increment);
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthed = status === 'authenticated';

  useEffect(() => {
    if (isAuthed) fetchUnreadCount();
  }, [isAuthed, fetchUnreadCount]);

  // Scroll to top on navigation (but not when only the query string changes).
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useSocketEvent('notification', (notification) => {
    if (location.pathname === '/notifications') return;
    incrementUnread();
    toast(describeNotification(notification).text, { icon: '●', id: notification._id });
  }, isAuthed);

  if (status === 'checking') return <Loader fullScreen label="Restoring your session" />;
  if (!isAuthed) return <Navigate to="/login" replace state={{ from: location }} />;

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const profilePath = `/profile/${user?.username}`;

  return (
    <div className="flex min-h-dvh justify-center">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[90] focus:rounded focus:bg-ink focus:px-4 focus:py-2 focus:text-ivory">
        Skip to content
      </a>

      {/* Desktop / tablet sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-[84px] shrink-0 flex-col border-r-2 border-ink px-3 py-5 md:flex lg:w-64 lg:px-5">
        <Link to="/debates" className="mb-8 flex items-center justify-center lg:justify-start" aria-label="ForReal">
          <Wordmark surface="ember" className="hidden text-[2.6rem] lg:inline-flex" />
          <span className="font-display text-4xl lg:hidden" aria-hidden="true">
            <span className="text-ivory">F</span>R
          </span>
        </Link>

        <nav className="flex flex-1 flex-col gap-1" aria-label="Primary">
          {NAV.map(({ to, icon: Icon, label, badge }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 rounded-[4px] border-2 px-3 py-2.5 text-[15px] font-bold transition-colors ${
                  isActive ? 'border-ink bg-ivory text-ink shadow-hard-sm' : 'border-transparent text-ink hover:border-ink'
                } justify-center lg:justify-start`
              }
              aria-label={label}
            >
              {({ isActive }) => (
                <>
                  <Icon size={21} strokeWidth={isActive ? 2.75 : 2.25} className={isActive ? 'text-ember' : ''} aria-hidden="true" />
                  <span className="hidden lg:inline">{label}</span>
                  {badge && <Badge count={unread} className="absolute -right-1 -top-1 lg:static lg:ml-auto" />}
                </>
              )}
            </NavLink>
          ))}
          <NavLink
            to={profilePath}
            className={({ isActive }) =>
              `flex items-center justify-center gap-3 rounded-[4px] border-2 px-3 py-2.5 text-[15px] font-bold lg:justify-start ${
                isActive ? 'border-ink bg-ivory text-ink shadow-hard-sm' : 'border-transparent hover:border-ink'
              }`
            }
            aria-label="Profile"
          >
            {({ isActive }) => (
              <>
                <User size={21} strokeWidth={isActive ? 2.75 : 2.25} className={isActive ? 'text-ember' : ''} aria-hidden="true" />
                <span className="hidden lg:inline">Profile</span>
              </>
            )}
          </NavLink>

          <Button to="/debates?new=1" variant="ivory" className="mt-5 !px-0 lg:!px-5" aria-label="Open a debate">
            <Plus size={18} strokeWidth={3} />
            <span className="hidden lg:inline">Open a debate</span>
          </Button>
        </nav>

        <AccountMenu user={user} onLogout={handleLogout} />
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col md:max-w-[720px] md:border-r-2 md:border-ink xl:max-w-[760px]">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-40 flex items-center justify-between border-b-2 border-ink bg-ember/95 px-4 py-3 backdrop-blur-sm md:hidden">
          <Link to="/debates" className="text-[2rem]" aria-label="ForReal">
            <Wordmark surface="ember" />
          </Link>
          <div className="flex items-center gap-1">
            <Link to="/debates?new=1" className="inline-flex h-10 w-10 items-center justify-center rounded-[4px] border-2 border-ink bg-ivory" aria-label="Open a debate">
              <Plus size={20} strokeWidth={3} />
            </Link>
            <NavLink to="/notifications" className="relative inline-flex h-10 w-10 items-center justify-center rounded-[4px] border-2 border-transparent" aria-label="Notifications">
              <Bell size={22} strokeWidth={2.5} />
              <Badge count={unread} className="absolute -right-0.5 -top-0.5" />
            </NavLink>
            <Link to="/settings" className="inline-flex h-10 w-10 items-center justify-center" aria-label="Settings">
              <Avatar src={user?.profile?.avatar} username={user?.username} size="sm" />
            </Link>
          </div>
        </header>

        <main id="main" className="flex-1 px-4 pb-28 pt-6 sm:px-6 md:pb-12 md:pt-8">
          <ErrorBoundary resetKey={location.pathname}>
            <Suspense fallback={<SkeletonList count={3} />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>

      {/* Right rail */}
      <aside className="sticky top-0 hidden h-dvh w-80 shrink-0 flex-col gap-4 overflow-y-auto px-5 py-8 xl:flex">
        <section className="card p-5">
          <p className="eyebrow">House rules</p>
          <ol className="mt-4 space-y-4">
            {[
              ['Challenge ideas.', 'Question the claim, not the person making it.'],
              ['Defend your opinions.', 'Back your side with reasons and sources.'],
              ['Respect the conversation.', 'Disagree hard. Never make it personal.'],
            ].map(([rule, detail], i) => (
              <li key={rule} className="flex gap-3">
                <span className="font-display text-3xl text-ember">0{i + 1}</span>
                <span>
                  <span className="block font-bold">{rule}</span>
                  <span className="block text-sm text-ink/75">{detail}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="card p-5">
          <p className="eyebrow">How a debate works</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><strong>Pick a side</strong> — you can switch while it’s live.</li>
            <li><strong>Make your case</strong> — cite a source to strengthen it.</li>
            <li><strong>Endorse strong points</strong> — not loud ones.</li>
            <li><strong>The clock closes it</strong> — the vote is the verdict.</li>
          </ul>
          <Link to="/debates" className="mt-4 inline-block text-sm font-extrabold underline decoration-ember decoration-2 underline-offset-4">
            Browse live debates
          </Link>
        </section>

        <p className="px-1 text-xs font-semibold text-ink">
          <Link to="/welcome?replay=1" className="underline underline-offset-2">Replay the intro</Link>
          {' · '}
          <a href="https://github.com/shanmukha1013/ForReal" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Source</a>
        </p>
      </aside>

      {/* Mobile bottom navigation */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t-2 border-ink bg-ivory md:hidden" aria-label="Primary">
        <div className="flex justify-around px-2 pt-2">
          {[...NAV.filter((n) => n.to !== '/notifications'), { to: profilePath, icon: User, label: 'Profile' }].map(({ to, icon: Icon, label }) => (
            <NavLink
              key={label}
              to={to}
              className={({ isActive }) =>
                `flex min-w-14 flex-col items-center gap-0.5 rounded-[4px] px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider ${
                  isActive ? 'bg-ember text-ink' : 'text-ink'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={22} strokeWidth={isActive ? 2.75 : 2} aria-hidden="true" />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};
