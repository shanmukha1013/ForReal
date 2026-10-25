import React from 'react';

const CONFIG = {
  live: { label: 'Live', className: 'bg-ember text-ink border-ink', pulse: true },
  ending_soon: { label: 'Ending soon', className: 'bg-ink text-ivory border-ink', pulse: true },
  finished: { label: 'Closed', className: 'bg-transparent text-ink border-ink border-dashed' },
  archived: { label: 'Archived', className: 'bg-transparent text-ink border-ink border-dashed' },
  draft: { label: 'Draft', className: 'bg-transparent text-ink border-ink border-dashed' },
};

export const StatusBadge = ({ status, className = '' }) => {
  // Legacy statuses from the old AI pipeline are presented as closed.
  const current = CONFIG[status] || CONFIG.finished;
  return (
    <span className={`eyebrow inline-flex items-center gap-1.5 rounded-[3px] border-2 px-2 py-0.5 ${current.className} ${className}`}>
      {current.pulse && (
        <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full rounded-full bg-current motion-safe:animate-[live-ping_1.6s_ease-out_infinite]" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      )}
      {current.label}
    </span>
  );
};
