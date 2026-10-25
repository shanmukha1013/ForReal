import React from 'react';
import { FileCheck2, MessageSquare, Reply, Users } from 'lucide-react';
import { percent, plural } from '@/lib/format';
import { sideIndex, sideLetter, sideTone } from '@/lib/sides';

// Real, aggregated statistics about the arguments on each side — computed by
// the API from stored arguments, never estimated or generated.
export const DebatePulse = ({ debate }) => {
  const pulse = debate.pulse;
  if (!pulse) return null;

  const stats = [
    { icon: Users, label: 'Participants', value: debate.stats?.participantCount || 0 },
    { icon: MessageSquare, label: 'Arguments', value: pulse.totalArguments },
    { icon: FileCheck2, label: 'Cite evidence', value: `${percent(pulse.evidenceBacked, pulse.totalArguments)}%` },
    { icon: Reply, label: 'Replies', value: pulse.replies },
  ];

  const sides = [
    ...debate.options.map((opt) => ({ id: opt._id, label: opt.label })),
    { id: null, label: 'Neutral' },
  ].map((side) => {
    const data = pulse.sides.find((s) => String(s.optionId ?? null) === String(side.id ?? null));
    return { ...side, arguments: data?.arguments || 0, withEvidence: data?.withEvidence || 0, endorsements: data?.endorsements || 0 };
  }).filter((side) => side.id !== null || side.arguments > 0);

  const maxArgs = Math.max(1, ...sides.map((s) => s.arguments));

  return (
    <section className="card p-5 sm:p-6" aria-labelledby="pulse-heading">
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <h2 id="pulse-heading" className="font-display text-3xl">Debate pulse</h2>
        <span className="eyebrow">From real activity</span>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-[4px] border-2 border-ink/15 p-3">
            <dt className="flex items-center gap-1.5 text-xs font-bold text-ink/70">
              <Icon size={14} strokeWidth={2.5} aria-hidden="true" /> {label}
            </dt>
            <dd className="font-display tabular mt-1 text-3xl">{value}</dd>
          </div>
        ))}
      </dl>

      {pulse.totalArguments > 0 && (
        <div className="mt-5 space-y-3">
          <p className="eyebrow">Arguments per side</p>
          {sides.map((side) => {
            const index = side.id ? sideIndex(debate.options, side.id) : -1;
            const tone = index >= 0 ? sideTone(index) : null;
            return (
              <div key={side.id || 'neutral'}>
                <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2 font-bold">
                    <span className="font-display w-4 text-center" aria-hidden="true">{index >= 0 ? sideLetter(index) : '–'}</span>
                    <span className="truncate">{side.label}</span>
                  </span>
                  <span className="tabular shrink-0 text-xs font-bold text-ink/70">
                    {plural(side.arguments, 'argument')} · {side.withEvidence} sourced · {plural(side.endorsements, 'endorsement')}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-[2px] border-2 border-ink bg-ivory">
                  <div
                    className={`h-full ${tone ? tone.swatch : 'bg-ink/30'} transition-[width] duration-700`}
                    style={{ width: `${(side.arguments / maxArgs) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export const VerdictPanel = ({ debate }) => {
  if (debate.status !== 'finished' && debate.status !== 'archived') return null;
  const verdict = debate.finalVerdict;
  const winner = debate.options.find((o) => String(o._id) === String(verdict?.winningOptionId));
  const total = debate.stats?.totalVotes || 0;

  return (
    <section className="on-ink rounded-[var(--radius-card)] border-2 border-ink bg-ink p-6 text-ivory shadow-hard" aria-labelledby="verdict-heading">
      <p className="eyebrow text-ember">The verdict</p>
      <h2 id="verdict-heading" className="font-display mt-2 text-4xl sm:text-5xl">
        {winner ? winner.label : total ? 'A dead heat.' : 'No votes cast.'}
      </h2>
      <p className="mt-3 text-ivory/80">
        {verdict?.communityVerdict || (winner
          ? `"${winner.label}" carried the room with ${percent(winner.votes, total)}% of ${total} votes.`
          : 'The debate closed without a majority.')}
      </p>
      {debate.lifecycle?.finishedAt && (
        <p className="mt-3 text-xs font-bold text-ivory/65">
          Closed {new Date(debate.lifecycle.finishedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
      )}
    </section>
  );
};
