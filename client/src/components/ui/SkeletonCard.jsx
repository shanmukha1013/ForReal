import React from 'react';

export const SkeletonCard = ({ className = '' }) => {
  return (
    <div className={`bg-card-dark rounded-xl border border-border-subtle p-4 sm:p-5 mb-4 animate-skeleton-pulse backdrop-blur-xl ${className}`}>
      <div className="flex gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-border-subtle shrink-0" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-3.5 bg-border-subtle rounded w-32" />
          <div className="h-3 bg-border-subtle rounded w-20" />
        </div>
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-3.5 bg-border-subtle rounded w-full" />
        <div className="h-3.5 bg-border-subtle rounded w-5/6" />
        <div className="h-3.5 bg-border-subtle rounded w-3/4" />
      </div>
      <div className="flex gap-4 pt-3 border-t border-border-subtle/50">
        <div className="h-4 bg-border-subtle rounded w-8" />
        <div className="h-4 bg-border-subtle rounded w-8" />
        <div className="h-4 bg-border-subtle rounded w-8" />
      </div>
    </div>
  );
};
