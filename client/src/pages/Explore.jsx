import React from 'react';
import { usePageTitle } from '@/hooks';
import { Compass, Search, TrendingUp, Award } from 'lucide-react';

export const Explore = () => {
  usePageTitle('Explore | ForReal');

  return (
    <div className="max-w-3xl mx-auto pb-20">
      <div className="mb-8 relative">
        <h1 className="text-3xl font-black text-white tracking-tight mb-4">Explore</h1>
        
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={20} />
          <input 
            type="text" 
            placeholder="Search users, debates, and logic topics..."
            className="w-full bg-surface border border-border-subtle rounded-xl py-3 pl-12 pr-4 text-white placeholder-text-muted focus:border-primary focus:outline-none transition-colors"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-6 mb-10">
        <div className="bg-card-dark border border-border-subtle rounded-xl p-5 relative overflow-hidden group hover:border-primary/50 transition-colors">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-colors" />
          <TrendingUp className="text-primary mb-3" size={24} />
          <h3 className="text-lg font-bold text-white mb-1">Trending Logicians</h3>
          <p className="text-sm text-text-muted">Discover the top debaters of the week.</p>
        </div>
        
        <div className="bg-card-dark border border-border-subtle rounded-xl p-5 relative overflow-hidden group hover:border-primary/50 transition-colors">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-colors" />
          <Award className="text-primary mb-3" size={24} />
          <h3 className="text-lg font-bold text-white mb-1">Hall of Logic</h3>
          <p className="text-sm text-text-muted">Review the most mathematically sound debates.</p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold text-white mb-4">Discover Topics</h2>
        <div className="flex flex-wrap gap-2">
          {['Technology', 'Artificial Intelligence', 'Philosophy', 'Science', 'Economics', 'Ethics'].map(topic => (
            <span key={topic} className="px-4 py-2 rounded-full border border-border-subtle text-sm text-white bg-surface hover:bg-primary/10 hover:border-primary/30 transition-colors cursor-pointer">
              {topic}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
