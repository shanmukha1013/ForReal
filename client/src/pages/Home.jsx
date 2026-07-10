import React from 'react';
import useAuthStore from '@/store/useAuthStore';
import { Card } from '@/components';

export const Home = () => {
  const { user } = useAuthStore();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white tracking-tight">Home</h1>
      </div>

      <Card>
        <h2 className="text-xl font-bold text-white mb-2">Welcome to ForReal, {user?.username}</h2>
        <p className="text-text-muted">
          This is the foundation of the platform. Your home feed and talks will appear here in future sprints.
        </p>
      </Card>
      
      {/* Placeholder for future Talks Feed */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="opacity-50 border-dashed">
            <div className="h-4 bg-border-subtle rounded w-1/4 mb-4"></div>
            <div className="h-2 bg-border-subtle rounded w-full mb-2"></div>
            <div className="h-2 bg-border-subtle rounded w-3/4"></div>
          </Card>
        ))}
      </div>
    </div>
  );
};
