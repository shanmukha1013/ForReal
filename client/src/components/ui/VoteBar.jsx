import React from 'react';
import { sideTone } from '@/lib/sides';
import { percent } from '@/lib/format';

// Stacked share of votes per side. Widths animate via transform-free CSS
// transitions on flex-basis, which only runs when the numbers change.
export const VoteBar = ({ options = [], totalVotes = 0, height = 'h-3', className = '' }) => (
  <div
    className={`flex w-full overflow-hidden rounded-[3px] border-2 border-ink bg-ivory ${height} ${className}`}
    role="img"
    aria-label={options.map((opt) => `${opt.label} ${percent(opt.votes, totalVotes)}%`).join(', ')}
  >
    {totalVotes === 0 ? (
      <div className="h-full w-full text-ink/25 hatched" />
    ) : (
      options.map((opt, i) => {
        const share = percent(opt.votes, totalVotes);
        if (!share) return null;
        return (
          <div
            key={opt._id || i}
            className={`h-full ${sideTone(i).swatch} border-ink transition-[flex-basis] duration-700 ease-[var(--ease-out-expo)] [&:not(:last-child)]:border-r-2`}
            style={{ flexBasis: `${share}%` }}
          />
        );
      })
    )}
  </div>
);
