import React from 'react';
import { Trophy, TrendingUp } from 'lucide-react';
import { CredibilityBadge } from '@/components/ui';

export const DebateLeaderboard = ({ leaders }) => {
  return (
    <div className="bg-card-dark rounded-xl border border-border-subtle p-6">
      <div className="flex items-center gap-2 mb-6">
        <Trophy className="text-warning" size={20} />
        <h3 className="text-lg font-bold text-white tracking-wide">Top Logicians</h3>
      </div>
      
      <div className="space-y-4">
        {leaders?.map((user, idx) => (
          <div key={user._id} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-text-muted font-black w-4 text-center">{idx + 1}</span>
              <div className="w-8 h-8 rounded-full bg-border-subtle overflow-hidden">
                {user.profile?.avatar ? (
                  <img src={user.profile.avatar} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-primary/20 flex items-center justify-center font-bold text-primary text-xs">
                    {user.username?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <div className="font-bold text-sm text-white">{user.username}</div>
                <div className="flex gap-2 text-[10px] text-text-muted mt-0.5">
                  <span className="flex items-center gap-0.5">
                    <TrendingUp size={10} className="text-success" />
                    {user.debateStats?.wins || 0} wins
                  </span>
                </div>
              </div>
            </div>
            
            <CredibilityBadge score={user.credibilityScore || 50} />
          </div>
        ))}
      </div>
    </div>
  );
};
