import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import useAuthStore from '@/store/useAuthStore';
import { Loader, Logo } from '@/components';

export const AuthLayout = () => {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) return <Loader fullScreen />;
  if (isAuthenticated) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-bg-dark text-white relative overflow-hidden selection:bg-primary/30">
      
      {/* Global Background Depth */}
      <div className="absolute inset-0 bg-noise opacity-30 mix-blend-overlay pointer-events-none z-0" />
      
      {/* Deep black background with soft blue spotlight */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_#020202_100%)] opacity-90 pointer-events-none z-0" />
      
      {/* Soft blue spotlight */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] bg-primary/10 rounded-full blur-[140px] pointer-events-none animate-slow-drift z-0" />

      {/* Auth Container */}
      <div className="w-full max-w-[440px] px-6 relative z-10 animate-fade-in-up">
        
        {/* Top Logo */}
        <div className="flex justify-center mb-10">
          <Logo size="md" />
        </div>
        
        <Outlet />
      </div>
    </div>
  );
};
