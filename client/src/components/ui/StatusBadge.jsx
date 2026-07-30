import React from 'react';

export const StatusBadge = ({ status }) => {
  const config = {
    draft: { label: 'DRAFT', color: 'bg-border-subtle text-text-muted' },
    live: { label: 'LIVE', color: 'bg-primary/20 text-primary-bright border border-primary/30 shadow-[0_0_12px_rgba(0,200,255,0.2)]' },
    ending_soon: { label: 'ENDING SOON', color: 'bg-warning/20 text-warning border border-warning/30 animate-pulse' },
    voting: { label: 'VOTING', color: 'bg-primary/10 text-primary border border-primary/20' },
    ai_analysis: { label: 'AI ANALYSIS', color: 'bg-purple-500/20 text-purple-400 border border-purple-500/30' },
    finished: { label: 'FINISHED', color: 'bg-success/20 text-success border border-success/30' },
    archived: { label: 'ARCHIVED', color: 'bg-card-elevated text-text-muted border border-border-muted' }
  };

  const current = config[status] || config.draft;

  return (
    <div className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${current.color}`}>
      {current.label}
    </div>
  );
};
