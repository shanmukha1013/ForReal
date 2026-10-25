import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileCheck2, MessageSquare, Trash2, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '@/store/useAuthStore';
import { confirmAction } from '@/store/useConfirmStore';
import { debateService } from '@/services/debateService';
import { useSocket, useSocketEvent, usePageTitle } from '@/hooks';
import { Avatar, Button, CountdownTimer, EmptyState, ErrorState, Skeleton, SkeletonList, StatusBadge, Tabs } from '@/components/ui';
import { RichText } from '@/components/feed/TalkContent';
import { VotePanel } from '@/features/debates/VotePanel';
import { DebatePulse, VerdictPanel } from '@/features/debates/DebatePulse';
import { ArgumentCard } from '@/features/debates/ArgumentCard';
import { ArgumentComposer } from '@/features/debates/ArgumentComposer';
import { displayName, plural, sameId, timeAgo } from '@/lib/format';
import { sideLetter } from '@/lib/sides';

// Keeps the aggregated "Debate pulse" in step with arguments added or removed
// on this page, without refetching the debate.
const adjustPulse = (pulse, comment, delta) => {
  if (!pulse || !comment) return pulse;
  const key = comment.optionId ? String(comment.optionId) : 'null';
  const evidence = comment.references?.length ? delta : 0;
  const sides = [...pulse.sides];
  const index = sides.findIndex((s) => String(s.optionId ?? null) === key);
  const base = index >= 0 ? sides[index] : { optionId: comment.optionId || null, arguments: 0, withEvidence: 0, endorsements: 0 };
  const next = {
    ...base,
    arguments: Math.max(0, base.arguments + delta),
    withEvidence: Math.max(0, base.withEvidence + evidence),
    endorsements: delta < 0 ? Math.max(0, base.endorsements - (comment.reactionsCount?.like || 0)) : base.endorsements,
  };
  if (index >= 0) sides[index] = next;
  else sides.push(next);
  return {
    ...pulse,
    sides,
    totalArguments: Math.max(0, pulse.totalArguments + delta),
    evidenceBacked: Math.max(0, pulse.evidenceBacked + evidence),
  };
};

const DebateSkeleton = () => (
  <div className="space-y-5" aria-label="Loading debate" role="status">
    <Skeleton className="h-5 w-40" />
    <Skeleton className="h-16 w-full" />
    <Skeleton className="h-4 w-2/3" />
    <SkeletonList count={2} />
  </div>
);

export default function DebateView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [debate, setDebate] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [args, setArgs] = useState([]);
  const [argsState, setArgsState] = useState({ status: 'loading', page: 1, pages: 1, total: 0 });
  const [filter, setFilter] = useState({ side: 'all', sort: 'newest' });
  const [typingUser, setTypingUser] = useState(null);
  const [liveReplies, setLiveReplies] = useState({});
  const typingTimeout = useRef(null);
  const socket = useSocket();

  usePageTitle(debate?.title || 'Debate');

  const patchDebate = useCallback((updates) => setDebate((d) => (d ? { ...d, ...updates } : d)), []);

  const loadDebate = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await debateService.get(id);
      setDebate(res.data);
    } catch (error) {
      setLoadError(error);
    }
  }, [id]);

  const loadArguments = useCallback(async (page = 1) => {
    setArgsState((s) => ({ ...s, status: page === 1 ? 'loading' : 'more' }));
    try {
      const res = await debateService.listArguments(id, {
        page,
        limit: 20,
        sort: filter.sort,
        side: filter.side === 'all' ? undefined : filter.side,
      });
      setArgs((prev) => (page === 1 ? res.data.comments : [...prev, ...res.data.comments.filter((c) => !prev.some((p) => p._id === c._id))]));
      setArgsState({ status: 'ready', page, pages: res.data.pages, total: res.data.total });
    } catch (error) {
      setArgsState((s) => ({ ...s, status: 'error', error: error.message }));
    }
  }, [id, filter]);

  useEffect(() => {
    setDebate(null);
    loadDebate();
  }, [loadDebate]);

  useEffect(() => {
    loadArguments(1);
  }, [loadArguments]);

  // Real-time room membership (re-joined after reconnects).
  useEffect(() => {
    if (!socket) return undefined;
    const join = () => socket.emit('join_debate', id);
    join();
    socket.on('connect', join);
    return () => {
      socket.off('connect', join);
      socket.emit('leave_debate', id);
    };
  }, [id, socket]);

  useEffect(() => () => clearTimeout(typingTimeout.current), []);

  const matchesFilter = (comment) =>
    filter.side === 'all' || (filter.side === 'neutral' ? !comment.optionId : String(comment.optionId) === filter.side);

  useSocketEvent('debate_updated', (update) => {
    if (String(update._id) !== id) return;
    // Merge only the live fields; keep the populated creator and our own vote.
    setDebate((d) => (d ? { ...d, ...update, creator: d.creator, userVote: d.userVote, pulse: d.pulse } : d));
  });

  useSocketEvent('new_comment', (comment) => {
    if (String(comment.debate) !== id || sameId(comment.author?._id, user?._id)) return;
    if (filter.sort === 'newest' && matchesFilter(comment)) {
      setArgs((prev) => (prev.some((c) => c._id === comment._id) ? prev : [comment, ...prev]));
    }
    setDebate((d) => (d ? {
      ...d,
      stats: { ...d.stats, totalComments: (d.stats?.totalComments || 0) + 1 },
      pulse: adjustPulse(d.pulse, comment, 1),
    } : d));
  });

  useSocketEvent('new_reply', ({ parentId, reply }) => {
    if (String(reply.debate) !== id || sameId(reply.author?._id, user?._id)) return;
    setArgs((prev) => prev.map((c) => (String(c._id) === String(parentId) ? { ...c, repliesCount: (c.repliesCount || 0) + 1 } : c)));
    setLiveReplies((prev) => ({ ...prev, [parentId]: [...(prev[parentId] || []), reply] }));
    setDebate((d) => (d ? {
      ...d,
      stats: { ...d.stats, totalComments: (d.stats?.totalComments || 0) + 1 },
      pulse: d.pulse ? { ...d.pulse, replies: d.pulse.replies + 1 } : d.pulse,
    } : d));
  });

  useSocketEvent('debate_typing', ({ username }) => {
    if (!username || username === user?.username) return;
    setTypingUser(username);
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => setTypingUser(null), 4000);
  });

  useSocketEvent('debate_stop_typing', () => setTypingUser(null));

  const handlePosted = (comment) => {
    if (matchesFilter(comment)) setArgs((prev) => [comment, ...prev.filter((c) => c._id !== comment._id)]);
    setDebate((d) => {
      if (!d) return d;
      const newcomer = !d.userVote && !args.some((a) => sameId(a.author?._id, user?._id));
      return {
        ...d,
        stats: {
          ...d.stats,
          totalComments: (d.stats?.totalComments || 0) + 1,
          participantCount: (d.stats?.participantCount || 0) + (newcomer ? 1 : 0),
        },
        pulse: adjustPulse(d.pulse, comment, 1),
      };
    });
    setArgsState((s) => ({ ...s, total: s.total + 1 }));
  };

  const argsRef = useRef(args);
  argsRef.current = args;

  const patchArgument = useCallback((commentId, updates, meta) => {
    const before = argsRef.current.find((c) => c._id === commentId);
    setArgs((prev) => prev.map((c) => (c._id === commentId ? { ...c, ...updates } : c)));

    const endorseDelta = updates.reactionsCount && before
      ? (updates.reactionsCount.like || 0) - (before.reactionsCount?.like || 0)
      : 0;
    if (!meta?.commentsDelta && !endorseDelta) return;

    setDebate((d) => {
      if (!d) return d;
      let { pulse } = d;
      if (pulse && meta?.commentsDelta) pulse = { ...pulse, replies: Math.max(0, pulse.replies + meta.commentsDelta) };
      if (pulse && endorseDelta) {
        const key = before.optionId ? String(before.optionId) : 'null';
        pulse = {
          ...pulse,
          sides: pulse.sides.map((s) => (String(s.optionId ?? null) === key ? { ...s, endorsements: Math.max(0, s.endorsements + endorseDelta) } : s)),
        };
      }
      return {
        ...d,
        pulse,
        stats: meta?.commentsDelta
          ? { ...d.stats, totalComments: Math.max(0, (d.stats?.totalComments || 0) + meta.commentsDelta) }
          : d.stats,
      };
    });
  }, []);

  const handleDeleted = useCallback((commentId, removed = 1) => {
    const removedComment = argsRef.current.find((c) => c._id === commentId);
    setArgs((prev) => prev.filter((c) => c._id !== commentId));
    setArgsState((s) => ({ ...s, total: Math.max(0, s.total - 1) }));
    setDebate((d) => {
      if (!d) return d;
      const pulse = adjustPulse(d.pulse, removedComment, -1);
      return {
        ...d,
        stats: { ...d.stats, totalComments: Math.max(0, (d.stats?.totalComments || 0) - removed) },
        pulse: pulse ? { ...pulse, replies: Math.max(0, pulse.replies - (removed - 1)) } : pulse,
      };
    });
  }, []);

  const deleteDebate = async () => {
    const ok = await confirmAction({
      title: 'Delete this debate?',
      message: 'The debate, every argument and every vote will be permanently removed.',
      confirmLabel: 'Delete debate',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await debateService.remove(id);
      toast.success('Debate deleted.');
      navigate('/debates', { replace: true });
    } catch (error) {
      toast.error(error.message);
    }
  };

  if (loadError) {
    return (
      <ErrorState
        title={loadError.status === 404 ? 'This debate doesn’t exist.' : 'This debate didn’t load.'}
        message={loadError.status === 404 ? 'It may have been deleted by its creator.' : loadError.message}
        onRetry={loadError.status === 404 ? undefined : loadDebate}
      />
    );
  }
  if (!debate) return <DebateSkeleton />;

  const isOpen = debate.status === 'live' || debate.status === 'ending_soon';
  const isCreator = sameId(user?._id, debate.creator?._id);
  const sideTabs = [
    { value: 'all', label: 'All' },
    ...debate.options.map((opt, i) => ({ value: String(opt._id), label: `${sideLetter(i)} · ${opt.label}` })),
    { value: 'neutral', label: 'Neutral' },
  ];

  return (
    <div className="space-y-6">
      <Link to="/debates" className="inline-flex items-center gap-2 text-sm font-extrabold">
        <ArrowLeft size={16} strokeWidth={2.75} /> All debates
      </Link>

      {/* The motion */}
      <header className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b-2 border-ink bg-ember px-5 py-3 sm:px-6">
          <StatusBadge status={debate.status} />
          <span className="eyebrow">{debate.category}</span>
          {debate.settings?.evidenceRequired && (
            <span className="eyebrow inline-flex items-center gap-1 rounded-[3px] border-2 border-ink bg-ivory px-1.5 py-0.5">
              <FileCheck2 size={12} strokeWidth={3} aria-hidden="true" /> Evidence required
            </span>
          )}
          <span className="ml-auto">
            {isOpen ? (
              <CountdownTimer targetDate={debate.lifecycle?.endsAt} />
            ) : (
              <span className="text-xs font-bold">Closed {timeAgo(debate.lifecycle?.finishedAt || debate.lifecycle?.endsAt)}</span>
            )}
          </span>
        </div>
        <div className="p-5 sm:p-6">
          <p className="eyebrow mb-2">The motion</p>
          <h1 className="font-display text-[2.6rem] leading-[0.92] text-balance sm:text-6xl">{debate.title}</h1>
          <RichText text={debate.description} className="mt-4 text-[15px] leading-relaxed text-ink/85" />

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t-2 border-ink/15 pt-4">
            <Link to={`/profile/${debate.creator?.username}`} className="flex items-center gap-2.5 hover:underline">
              <Avatar src={debate.creator?.profile?.avatar} username={debate.creator?.username} size="sm" />
              <span className="text-sm">
                <span className="font-extrabold">{displayName(debate.creator)}</span>
                <span className="text-ink/70"> opened this {timeAgo(debate.createdAt)}</span>
              </span>
            </Link>
            <div className="flex items-center gap-4 text-xs font-bold">
              <span className="inline-flex items-center gap-1"><Users size={14} strokeWidth={2.5} aria-hidden="true" /> {plural(debate.stats?.participantCount || 0, 'participant')}</span>
              <span className="inline-flex items-center gap-1"><MessageSquare size={14} strokeWidth={2.5} aria-hidden="true" /> {plural(debate.stats?.totalComments || 0, 'post')}</span>
              {isCreator && (
                <button type="button" onClick={deleteDebate} className="inline-flex items-center gap-1 rounded-[4px] border-2 border-dashed border-ink px-2 py-1 hover:bg-ink hover:text-ivory">
                  <Trash2 size={13} strokeWidth={2.5} /> Delete
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <VerdictPanel debate={debate} />
      <VotePanel debate={debate} onUpdate={patchDebate} />
      <DebatePulse debate={debate} />

      {/* The floor */}
      <section aria-labelledby="floor-heading" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3 pt-2">
          <h2 id="floor-heading" className="font-display text-5xl">
            The floor <span className="font-accent text-ivory normal-case">({argsState.total})</span>
          </h2>
          <Tabs
            label="Sort arguments"
            tabs={[{ value: 'newest', label: 'Newest' }, { value: 'top', label: 'Strongest' }]}
            value={filter.sort}
            onChange={(sort) => setFilter((f) => ({ ...f, sort }))}
          />
        </div>

        {isOpen ? (
          <ArgumentComposer debate={debate} onPosted={handlePosted} />
        ) : (
          <p className="card border-dashed p-4 text-sm font-semibold">This debate is closed. Arguments are preserved as the public record.</p>
        )}

        {typingUser && (
          <p className="flex items-center gap-2 text-sm font-bold" role="status">
            <span className="inline-flex gap-1" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-1.5 w-1.5 rounded-full bg-ink motion-safe:animate-bounce" style={{ animationDelay: `${i * 120}ms` }} />
              ))}
            </span>
            @{typingUser} is drafting an argument…
          </p>
        )}

        <Tabs label="Filter by side" tabs={sideTabs} value={filter.side} onChange={(side) => setFilter((f) => ({ ...f, side }))} />

        {argsState.status === 'loading' ? (
          <SkeletonList count={2} />
        ) : argsState.status === 'error' && args.length === 0 ? (
          <ErrorState title="Arguments didn’t load." message={argsState.error} onRetry={() => loadArguments(1)} />
        ) : args.length === 0 ? (
          <EmptyState icon={MessageSquare} title={filter.side === 'all' ? 'The floor is open.' : 'Nothing on this side yet.'}>
            {isOpen ? 'Be the first to make a case — reasons first, sources if you have them.' : 'No arguments were made here.'}
          </EmptyState>
        ) : (
          <div className="space-y-4">
            {args.map((comment) => (
              <ArgumentCard
                key={comment._id}
                comment={comment}
                debate={debate}
                onPatch={patchArgument}
                onDeleted={handleDeleted}
                liveReplies={liveReplies[comment._id]}
              />
            ))}
            {argsState.page < argsState.pages && (
              <div className="flex justify-center">
                <Button variant="ivory" onClick={() => loadArguments(argsState.page + 1)} isLoading={argsState.status === 'more'}>
                  Load more arguments
                </Button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
