import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { AnimatedButton, SkeletonCard } from '@/components/ui';
import { DebateCard } from '@/features/debates/DebateCard';
import { CreateDebateModal } from '@/features/debates/CreateDebateModal';
import useDebateStore from '@/store/useDebateStore';
import { usePageTitle } from '@/hooks';

export const Debates = () => {
  usePageTitle('Debates | ForReal');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { debates, fetchDebates, isLoading } = useDebateStore();
  const [filter, setFilter] = useState('trending');

  useEffect(() => {
    fetchDebates(1, { sort: filter });
  }, [filter]);

  return (
    <div className="max-w-3xl mx-auto pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Active Debates</h1>
          <p className="text-sm text-text-muted mt-1">Engage in structured, logic-driven discussions.</p>
        </div>
        <AnimatedButton variant="primary" onClick={() => setIsCreateModalOpen(true)}>
          <Plus size={16} /> New Debate
        </AnimatedButton>
      </div>

      <div className="flex gap-2 mb-6 border-b border-border-subtle/50 pb-px">
        <button 
          onClick={() => setFilter('trending')}
          className={`pb-3 px-1 text-sm font-bold tracking-wide transition-colors border-b-2 ${filter === 'trending' ? 'text-white border-primary' : 'text-text-muted border-transparent hover:text-white'}`}
        >
          TRENDING
        </button>
        <button 
          onClick={() => setFilter('newest')}
          className={`pb-3 px-1 text-sm font-bold tracking-wide transition-colors border-b-2 ${filter === 'newest' ? 'text-white border-primary' : 'text-text-muted border-transparent hover:text-white'}`}
        >
          NEWEST
        </button>
        <button 
          onClick={() => setFilter('ending_soon')}
          className={`pb-3 px-1 text-sm font-bold tracking-wide transition-colors border-b-2 ${filter === 'ending_soon' ? 'text-white border-primary' : 'text-text-muted border-transparent hover:text-white'}`}
        >
          ENDING SOON
        </button>
      </div>

      <div className="space-y-4">
        {isLoading && debates.length === 0 ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : debates.length > 0 ? (
          debates.map(debate => (
            <DebateCard key={debate._id} debate={debate} />
          ))
        ) : (
          <div className="text-center py-24 border border-dashed border-border-subtle rounded-2xl bg-card-dark flex flex-col items-center justify-center">
             <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
               <Plus size={24} className="text-text-muted" />
             </div>
             <h3 className="text-xl font-bold text-white mb-2 tracking-tight">The floor is open.</h3>
             <p className="text-text-muted text-sm max-w-sm mx-auto mb-6 leading-relaxed">
               There are no debates happening here right now. Be the first to spark a meaningful, logic-driven conversation.
             </p>
             <AnimatedButton variant="primary" onClick={() => setIsCreateModalOpen(true)}>
               Start a Debate
             </AnimatedButton>
          </div>
        )}
      </div>

      <CreateDebateModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
    </div>
  );
};
