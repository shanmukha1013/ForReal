import React from 'react';
import { Outlet, Navigate, Link } from 'react-router-dom';
import useAuthStore from '@/store/useAuthStore';
import { Loader, Button } from '@/components';
import { LogOut, Home, User, Settings } from 'lucide-react';

export const MainLayout = () => {
  const { isAuthenticated, isLoading, logout, user } = useAuthStore();

  if (isLoading) return <Loader fullScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-bg-dark flex flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 border-r border-border-subtle flex-col p-6 sticky top-0 h-screen overflow-y-auto">
        <div className="mb-10">
          <Link to="/" className="text-2xl font-bold text-white tracking-tight">ForReal</Link>
        </div>
        
        <nav className="flex-1 flex flex-col gap-2">
          <Link to="/" className="flex items-center gap-3 text-text-main font-medium p-3 rounded-md bg-card-dark hover:bg-card-dark/80 transition-property-common">
            <Home size={20} className="text-primary" />
            Home
          </Link>
          <div className="flex items-center gap-3 text-text-muted font-medium p-3 rounded-md hover:bg-card-dark/50 cursor-pointer transition-property-common">
            <User size={20} />
            Profile (Coming Soon)
          </div>
          <div className="flex items-center gap-3 text-text-muted font-medium p-3 rounded-md hover:bg-card-dark/50 cursor-pointer transition-property-common">
            <Settings size={20} />
            Settings (Coming Soon)
          </div>
        </nav>

        <div className="mt-auto border-t border-border-subtle pt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-card-dark border border-border-subtle flex items-center justify-center font-bold text-primary">
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{user?.username}</p>
              <p className="text-xs text-text-muted truncate">@{user?.username}</p>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start text-error hover:text-error hover:bg-error/10" onClick={logout}>
            <LogOut size={18} className="mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen max-w-full">
        {/* Mobile Header */}
        <header className="md:hidden sticky top-0 z-[var(--z-index-sticky)] border-b border-border-subtle bg-bg-dark/80 backdrop-blur-md p-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-white tracking-tight">ForReal</Link>
          <Button variant="ghost" size="sm" onClick={logout} className="text-error">
            <LogOut size={18} />
          </Button>
        </header>

        <div className="flex-1 w-full max-w-3xl mx-auto p-4 md:p-8">
          <Outlet />
        </div>
        
        {/* Mobile Nav Placeholder */}
        <nav className="md:hidden sticky bottom-0 z-[var(--z-index-sticky)] border-t border-border-subtle bg-bg-dark p-4 flex justify-around">
           <Home size={24} className="text-primary" />
           <User size={24} className="text-text-muted" />
           <Settings size={24} className="text-text-muted" />
        </nav>
      </main>
    </div>
  );
};
