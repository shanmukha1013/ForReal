import React, { useEffect, useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { AnimatedButton, SkeletonCard } from '@/components/ui';
import { DebateCard } from '@/features/debates/DebateCard';
import { CreateDebateModal } from '@/features/debates/CreateDebateModal';
import useDebateStore from '@/store/useDebateStore';
import { usePageTitle } from '@/hooks';

export const Debates = () => {
  usePageTitle('Debates — ForReal');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { debates, fetchDebates, isLoading } = useDebateStore();
  const [filter, setFilter] = useState('trending');
  // Local copy for optimistic delete
  const [localDebates, setLocalDebates] = useState([]);

  useEffect(() => {
    fetchDebates(1, { sort: filter });
  }, [filter]);

  useEffect(() => {
    setLocalDebates(debates);
  }, [debates]);

  const handleDebateDeleted = useCallback((deletedId) => {
    setLocalDebates(prev => prev.filter(d => d._id !== deletedId));
  }, []);

  const handleDebateCreated = useCallback((newDebate) => {
    if (newDebate) {
      setLocalDebates(prev => [newDebate, ...prev]);
    }
    setIsCreateModalOpen(false);
  }, []);

  const tabs = [
    { key: 'trending', label: 'Trending' },
    { key: 'newest', label: 'Newest' },
    { key: 'ending_soon', label: 'Ending Soon' },
  ];

  return (
    <div className="max-w-3xl mx-auto pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Active Debates</h1>
          <p className="text-sm text-text-muted mt-1">Pick a side. Make your case. Let logic decide.</p>
        </div>
        <AnimatedButton variant="primary" onClick={() => setIsCreateModalOpen(true)}>
          <Plus size={16} /> Start a Debate
        </AnimatedButton>
      </div>

      <div className="flex gap-2 mb-6 border-b border-border-subtle/50 pb-px">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`pb-3 px-1 mr-4 text-sm font-bold tracking-wide transition-colors border-b-2 ${
              filter === tab.key
                ? 'text-white border-primary'
                : 'text-text-muted border-transparent hover:text-white'
            }`}
          >
            {tab.label.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {isLoading && localDebates.length === 0 ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : localDebates.length > 0 ? (
          localDebates.map(debate => (
            <DebateCard
              key={debate._id}
              debate={debate}
              onDeleted={handleDebateDeleted}
            />
          ))
        ) : (
          <div className="text-center py-24 border border-dashed border-border-subtle rounded-2xl bg-card-dark flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
              <Plus size={24} className="text-text-muted" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2 tracking-tight">The floor is open.</h3>
            <p className="text-text-muted text-sm max-w-sm mx-auto mb-6 leading-relaxed">
              No active debates right now. Be the first to spark an intelligent discussion.
            </p>
            <AnimatedButton variant="primary" onClick={() => setIsCreateModalOpen(true)}>
              Start a Debate
            </AnimatedButton>
          </div>
        )}
      </div>

      <CreateDebateModal
        isOpen={isCreateModalOpen}
        onClose={handleDebateCreated}
      />
    </div>
  );
};
