import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import useAuthStore from '@/store/useAuthStore';
import { Loader } from '@/components';

export const AuthLayout = () => {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) return <Loader fullScreen />;
  if (isAuthenticated) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-bg-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white tracking-tight">ForReal</h1>
          <p className="text-text-muted mt-2 tracking-widest text-sm uppercase">We don't talk shit</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
};
