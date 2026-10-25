import React, { useState } from 'react';
import { Check, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { debateService } from '@/services/debateService';
import { percent, plural, sameId } from '@/lib/format';
import { sideLetter, sideTone } from '@/lib/sides';

export const VotePanel = ({ debate, onUpdate }) => {
  const [pendingId, setPendingId] = useState(null);
  const total = debate.stats?.totalVotes || 0;
  const open = debate.status === 'live' || debate.status === 'ending_soon';
  const winnerId = debate.finalVerdict?.winningOptionId;

  const vote = async (optionId) => {
    if (!open || pendingId || sameId(debate.userVote, optionId)) return;
    const previous = { options: debate.options, stats: debate.stats, userVote: debate.userVote };

    // Optimistic: move the vote locally, reconcile with the server response.
    const options = debate.options.map((opt) => {
      if (sameId(opt._id, optionId)) return { ...opt, votes: opt.votes + 1 };
      if (sameId(opt._id, debate.userVote)) return { ...opt, votes: Math.max(0, opt.votes - 1) };
      return opt;
    });
    const stats = { ...debate.stats, totalVotes: debate.userVote ? total : total + 1 };
    onUpdate({ options, stats, userVote: optionId });
    setPendingId(optionId);

    try {
      const res = await debateService.vote(debate._id, optionId);
      onUpdate({ options: res.data.options, stats: res.data.stats, userVote: res.data.userVote, status: res.data.status });
      if (!previous.userVote) toast.success('Your vote is on the record.');
    } catch (error) {
      onUpdate(previous);
      toast.error(error.message);
    } finally {
      setPendingId(null);
    }
  };

  return (
    <section className="card p-5 sm:p-6" aria-labelledby="vote-heading">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="vote-heading" className="font-display text-3xl">{open ? 'Take a side' : 'Final vote'}</h2>
        <span className="tabular text-sm font-bold text-ink/70">{plural(total, 'vote')}</span>
      </div>

      {!open && (
        <p className="mb-4 flex items-center gap-2 text-sm font-semibold">
          <Lock size={15} strokeWidth={2.5} aria-hidden="true" /> Voting is closed. The record is final.
        </p>
      )}

      <div className={`grid gap-3 ${debate.options.length > 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2'}`} role="radiogroup" aria-labelledby="vote-heading">
        {debate.options.map((opt, i) => {
          const tone = sideTone(i);
          const share = percent(opt.votes, total);
          const selected = sameId(debate.userVote, opt._id);
          const isWinner = !open && sameId(winnerId, opt._id);
          return (
            <button
              key={opt._id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={!open || Boolean(pendingId)}
              onClick={() => vote(opt._id)}
              className={`group relative overflow-hidden rounded-[4px] border-2 border-ink p-4 text-left transition-[box-shadow,transform] duration-150 ${
                selected ? 'shadow-hard' : open ? 'hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard' : ''
              } ${selected ? 'bg-ember text-ink' : 'bg-ivory'} disabled:cursor-default`}
            >
              {/* Share-of-vote fill */}
              <span
                className={`absolute inset-y-0 left-0 ${selected ? 'bg-ink/10' : `${tone.swatch} opacity-20`} transition-[width] duration-700 ease-[var(--ease-out-expo)]`}
                style={{ width: `${share}%` }}
                aria-hidden="true"
              />
              <span className="relative flex items-start justify-between gap-3">
                <span className="flex min-w-0 items-start gap-3">
                  <span
                    className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] border-2 font-display text-lg ${
                      selected ? 'border-ink bg-ivory text-ink' : `border-ink ${tone.chip}`
                    }`}
                    aria-hidden="true"
                  >
                    {selected ? <Check size={18} strokeWidth={3.5} /> : sideLetter(i)}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-base font-extrabold leading-tight">{opt.label}</span>
                    <span className={`tabular mt-1 block text-xs font-bold ${selected ? 'text-ink' : 'text-ink/70'}`}>
                      {plural(opt.votes, 'vote')}
                      {selected && ' · your side'}
                      {isWinner && ' · carried the room'}
                    </span>
                  </span>
                </span>
                <span className="font-display tabular text-3xl">{share}%</span>
              </span>
            </button>
          );
        })}
      </div>

      {open && debate.userVote && (
        <p className="mt-3 text-xs font-semibold text-ink/70">Changed your mind? Switch sides any time before the clock runs out.</p>
      )}
    </section>
  );
};
