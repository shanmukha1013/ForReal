import React from 'react';
import { useParams } from 'react-router-dom';
import { usePageTitle } from '@/hooks';
import { AnimatedButton, CredibilityBadge } from '@/components/ui';

export const Profile = () => {
  const { username } = useParams();
  usePageTitle(`${username} | ForReal`);

  return (
    <div className="max-w-3xl mx-auto pb-20">
      {/* Cover */}
      <div className="h-48 w-full bg-gradient-to-r from-bg-dark via-primary/10 to-bg-dark rounded-xl mb-16 relative border border-border-subtle/50">
        {/* Avatar */}
        <div className="absolute -bottom-12 left-6">
          <div className="w-24 h-24 rounded-full bg-surface border-4 border-bg-dark flex items-center justify-center text-3xl font-black text-primary overflow-hidden">
            {username?.charAt(0).toUpperCase()}
          </div>
        </div>
        
        {/* Actions */}
        <div className="absolute -bottom-14 right-6 flex gap-2">
          <AnimatedButton variant="primary">Follow</AnimatedButton>
        </div>
      </div>

      <div className="px-2 mb-8">
        <h1 className="text-2xl font-black text-white tracking-tight mb-1">{username}</h1>
        <p className="text-text-muted text-sm mb-4">@user_{username?.toLowerCase()}</p>
        
        <div className="flex gap-4 mb-6">
          <CredibilityBadge score={75} size="lg" />
          <div className="flex flex-col text-sm border-l border-border-subtle pl-4">
            <span className="text-white font-bold">120</span>
            <span className="text-text-muted">Debates Won</span>
          </div>
          <div className="flex flex-col text-sm border-l border-border-subtle pl-4">
            <span className="text-white font-bold">2.4k</span>
            <span className="text-text-muted">Followers</span>
          </div>
        </div>
        
        <p className="text-sm text-white/90 leading-relaxed max-w-xl">
          Logician, Truth Seeker, and Developer. Exploring the boundaries of human knowledge and AI.
        </p>
      </div>
      
      {/* Tabs */}
      <div className="flex gap-6 border-b border-border-subtle mb-6 px-2">
        <div className="pb-3 border-b-2 border-primary text-white font-bold text-sm tracking-wide">
          DEBATES
        </div>
        <div className="pb-3 border-b-2 border-transparent text-text-muted font-bold text-sm tracking-wide hover:text-white transition-colors cursor-pointer">
          ARGUMENTS
        </div>
      </div>
      
      <div className="text-center py-20 text-text-muted text-sm">
        No active debates to show for this user.
      </div>
    </div>
  );
};
