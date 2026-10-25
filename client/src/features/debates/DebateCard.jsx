import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Users } from 'lucide-react';
import { Avatar, CountdownTimer, StatusBadge, VoteBar } from '@/components/ui';
import { compact, percent, displayName } from '@/lib/format';
import { sideTone } from '@/lib/sides';

export const DebateCard = React.memo(({ debate, rank }) => {
  const total = debate.stats?.totalVotes || 0;
  const open = debate.status === 'live' || debate.status === 'ending_soon';
  const options = debate.options || [];

  return (
    <article className="card card-interactive relative p-5 sm:p-6">
      {/* The whole card is a link; inner links sit above it. */}
      <Link to={`/debates/${debate._id}`} className="absolute inset-0 z-0 rounded-[inherit]" aria-label={debate.title} />

      <div className="pointer-events-none relative z-10">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <StatusBadge status={debate.status} />
          <span className="eyebrow">{debate.category}</span>
          {rank && <span className="font-display ml-auto text-2xl text-ember">#{rank}</span>}
          {!rank && open && <CountdownTimer targetDate={debate.lifecycle?.endsAt} className="ml-auto" />}
        </div>

        <h3 className="font-display text-[1.9rem] leading-[0.95] text-balance sm:text-[2.2rem]">{debate.title}</h3>
        {debate.description && (
          <p className="mt-2 line-clamp-2 text-sm text-ink/75">{debate.description}</p>
        )}

        <div className="mt-5">
          <VoteBar options={options} totalVotes={total} />
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {options.map((opt, i) => (
              <span key={opt._id} className="inline-flex min-w-0 items-center gap-1.5 text-xs font-bold">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-[2px] border border-ink ${sideTone(i).swatch}`} aria-hidden="true" />
                <span className="truncate">{opt.label}</span>
                <span className="tabular text-ink/70">{percent(opt.votes, total)}%</span>
              </span>
            ))}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 border-t-2 border-ink/15 pt-4">
          <Link
            to={`/profile/${debate.creator?.username}`}
            className="pointer-events-auto relative z-20 flex min-w-0 items-center gap-2 hover:underline"
          >
            <Avatar src={debate.creator?.profile?.avatar} username={debate.creator?.username} size="sm" />
            <span className="truncate text-xs font-bold">{displayName(debate.creator)}</span>
          </Link>
          <div className="flex shrink-0 items-center gap-4 text-xs font-bold">
            <span className="inline-flex items-center gap-1" title="Participants">
              <Users size={14} strokeWidth={2.5} aria-hidden="true" /> {compact(debate.stats?.participantCount || 0)}
              <span className="sr-only">participants</span>
            </span>
            <span className="inline-flex items-center gap-1" title="Arguments">
              <MessageSquare size={14} strokeWidth={2.5} aria-hidden="true" /> {compact(debate.stats?.totalComments || 0)}
              <span className="sr-only">arguments</span>
            </span>
          </div>
        </div>
      </div>
    </article>
  );
});

DebateCard.displayName = 'DebateCard';
