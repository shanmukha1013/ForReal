import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ChevronDown, MoreHorizontal, Pencil, Quote, Reply, ThumbsUp, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '@/store/useAuthStore';
import { confirmAction } from '@/store/useConfirmStore';
import { debateService } from '@/services/debateService';
import { Avatar, Button, Spinner } from '@/components/ui';
import { RichText } from '@/components/feed/TalkContent';
import { displayName, hostname, plural, sameId, timeAgo } from '@/lib/format';
import { sideIndex, sideLetter, sideTone } from '@/lib/sides';
import { MAX_ARGUMENT_LENGTH } from '@/lib/constants';

export const SideChip = ({ options, optionId }) => {
  const index = sideIndex(options, optionId);
  if (index < 0) {
    return <span className="eyebrow rounded-[3px] border-2 border-dashed border-ink px-1.5 py-0.5">Neutral</span>;
  }
  return (
    <span className={`eyebrow inline-flex max-w-[12rem] items-center gap-1 rounded-[3px] border-2 border-ink px-1.5 py-0.5 ${sideTone(index).chip}`}>
      <span aria-hidden="true">{sideLetter(index)} ·</span>
      <span className="truncate normal-case tracking-normal">{options[index].label}</span>
    </span>
  );
};

// "> quoted text\n\nreply" renders as a pull-quote followed by the reply.
const ArgumentBody = ({ content, compact = false }) => {
  const text = compact ? 'text-sm' : 'text-[15px]';
  if (content?.startsWith('> ')) {
    const [quote, ...rest] = content.split('\n\n');
    return (
      <div>
        <blockquote className="mb-2 border-l-4 border-ember bg-ink/[0.04] py-1.5 pl-3 text-sm italic text-ink/75">
          {quote.replace(/^> /, '')}
        </blockquote>
        <RichText text={rest.join('\n\n')} className={`${text} leading-relaxed`} />
      </div>
    );
  }
  return <RichText text={content} className={`${text} leading-relaxed`} />;
};

const References = ({ references }) =>
  references?.length ? (
    <ul className="mt-3 flex flex-wrap gap-2">
      {references.map((ref) => (
        <li key={ref.url}>
          <a
            href={ref.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="inline-flex items-center gap-1 rounded-[3px] border-2 border-ink bg-ember px-2 py-0.5 text-xs font-extrabold text-ink hover:bg-ink hover:text-ivory"
          >
            <ArrowUpRight size={13} strokeWidth={3} aria-hidden="true" />
            Source: {ref.title || hostname(ref.url) || 'link'}
          </a>
        </li>
      ))}
    </ul>
  ) : null;

const EndorseButton = ({ comment, debateId, isOwn, onChange }) => {
  const [busy, setBusy] = useState(false);
  const count = comment.reactionsCount?.like || 0;

  const toggle = async () => {
    if (isOwn || busy) return;
    setBusy(true);
    const previous = { isEndorsed: comment.isEndorsed, reactionsCount: comment.reactionsCount };
    onChange({ isEndorsed: !comment.isEndorsed, reactionsCount: { ...comment.reactionsCount, like: Math.max(0, count + (comment.isEndorsed ? -1 : 1)) } });
    try {
      const res = await debateService.endorse(debateId, comment._id);
      onChange({ isEndorsed: res.data.isEndorsed, reactionsCount: { ...comment.reactionsCount, like: res.data.endorsements } });
    } catch (error) {
      onChange(previous);
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isOwn}
      title={isOwn ? 'You can’t endorse your own argument' : 'Endorse as a strong point'}
      aria-pressed={Boolean(comment.isEndorsed)}
      className={`inline-flex h-8 items-center gap-1.5 rounded-[4px] border-2 px-2 text-xs font-bold disabled:opacity-60 ${
        comment.isEndorsed ? 'border-ink bg-ink text-ivory' : 'border-transparent hover:border-ink'
      }`}
    >
      <ThumbsUp size={14} strokeWidth={2.5} className={comment.isEndorsed ? 'fill-ember text-ember' : ''} aria-hidden="true" />
      <span className="hidden sm:inline">Strong point</span>
      {count > 0 && <span className="tabular">{count}</span>}
    </button>
  );
};

const ReplyComposer = ({ initial, onCancel, onSubmit }) => {
  const [text, setText] = useState(initial);
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (el) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    setBusy(true);
    const ok = await onSubmit(content);
    setBusy(false);
    if (ok) setText('');
  };

  return (
    <form onSubmit={submit} className="mt-3 flex flex-col gap-2 animate-fade">
      <label className="sr-only" htmlFor={`reply-${initial.length}`}>Your reply</label>
      <textarea
        ref={ref}
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={MAX_ARGUMENT_LENGTH}
        rows={3}
        placeholder="Respond to the argument, not the person…"
        className="field resize-y text-sm"
      />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button type="submit" size="sm" isLoading={busy} disabled={!text.trim()}>Post reply</Button>
      </div>
    </form>
  );
};

export const ArgumentCard = React.memo(({ comment, debate, onPatch, onDeleted, liveReplies }) => {
  const user = useAuthStore((s) => s.user);
  const isOwn = sameId(user?._id, comment.author?._id);
  const canModerate = isOwn || sameId(user?._id, debate.creator?._id);
  const isOpen = debate.status === 'live' || debate.status === 'ending_soon';

  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.content);
  const [composer, setComposer] = useState(null); // null | initial text
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState(null);
  const [repliesLoading, setRepliesLoading] = useState(false);

  // Replies posted by others arrive over the socket.
  useEffect(() => {
    if (!liveReplies?.length) return;
    setReplies((prev) => {
      if (!prev) return prev;
      const seen = new Set(prev.map((r) => r._id));
      const fresh = liveReplies.filter((r) => !seen.has(r._id));
      return fresh.length ? [...prev, ...fresh] : prev;
    });
  }, [liveReplies]);

  const loadReplies = useCallback(async () => {
    setRepliesLoading(true);
    try {
      const res = await debateService.listReplies(debate._id, comment._id);
      setReplies(res.data.replies);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setRepliesLoading(false);
    }
  }, [debate._id, comment._id]);

  const toggleReplies = () => {
    const next = !showReplies;
    setShowReplies(next);
    if (next && !replies) loadReplies();
  };

  const postReply = async (content) => {
    try {
      const res = await debateService.postArgument(debate._id, { content, parentComment: comment._id, optionId: comment.optionId || undefined });
      setReplies((prev) => (prev ? (prev.some((r) => r._id === res.data._id) ? prev : [...prev, res.data]) : [res.data]));
      setShowReplies(true);
      setComposer(null);
      onPatch(comment._id, { repliesCount: (comment.repliesCount || 0) + 1 }, { commentsDelta: 1 });
      return true;
    } catch (error) {
      toast.error(error.message);
      return false;
    }
  };

  const saveEdit = async () => {
    const content = draft.trim();
    if (!content || content === comment.content) return setEditing(false);
    try {
      const res = await debateService.editArgument(debate._id, comment._id, content);
      onPatch(comment._id, { content: res.data.content, isEdited: true });
      setEditing(false);
    } catch (error) {
      toast.error(error.message);
    }
    return undefined;
  };

  const remove = async () => {
    setMenuOpen(false);
    const ok = await confirmAction({
      title: 'Delete this argument?',
      message: 'The argument and all of its replies will be removed permanently.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      const res = await debateService.deleteArgument(debate._id, comment._id);
      onDeleted(comment._id, res.data.removed);
      toast.success('Argument deleted.');
    } catch (error) {
      toast.error(error.message);
    }
  };

  const removeReply = async (replyId) => {
    const ok = await confirmAction({ title: 'Delete reply?', message: 'This cannot be undone.', confirmLabel: 'Delete', tone: 'danger' });
    if (!ok) return;
    try {
      await debateService.deleteArgument(debate._id, replyId);
      setReplies((prev) => prev.filter((r) => r._id !== replyId));
      onPatch(comment._id, { repliesCount: Math.max(0, (comment.repliesCount || 1) - 1) }, { commentsDelta: -1 });
    } catch (error) {
      toast.error(error.message);
    }
  };

  const replyCount = Math.max(comment.repliesCount || 0, replies?.length || 0);

  return (
    <article className="card p-4 sm:p-5 animate-rise" id={`argument-${comment._id}`}>
      <header className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <Link to={`/profile/${comment.author?.username}`}>
            <Avatar src={comment.author?.profile?.avatar} username={comment.author?.username} size="md" />
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Link to={`/profile/${comment.author?.username}`} className="truncate text-[15px] font-extrabold hover:underline">
                {displayName(comment.author)}
              </Link>
              <SideChip options={debate.options} optionId={comment.optionId} />
            </div>
            <p className="mt-0.5 text-xs font-medium text-ink/70">
              @{comment.author?.username} · <time dateTime={comment.createdAt}>{timeAgo(comment.createdAt)}</time>
              {comment.isEdited && ' · edited'}
            </p>
          </div>
        </div>

        {canModerate && (
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              onBlur={(e) => {
                if (!e.currentTarget.parentElement.contains(e.relatedTarget)) setMenuOpen(false);
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-[4px] border-2 border-transparent hover:border-ink"
              aria-label="Argument options"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <MoreHorizontal size={18} />
            </button>
            {menuOpen && (
              <div role="menu" className="card absolute right-0 top-9 z-20 w-40 p-1 animate-pop shadow-hard-sm">
                {isOwn && isOpen && (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { setMenuOpen(false); setDraft(comment.content); setEditing(true); }}
                    className="flex w-full items-center gap-2 rounded-[3px] px-3 py-2 text-left text-sm font-semibold hover:bg-ink hover:text-ivory"
                  >
                    <Pencil size={15} /> Edit
                  </button>
                )}
                <button
                  type="button"
                  role="menuitem"
                  onClick={remove}
                  className="flex w-full items-center gap-2 rounded-[3px] px-3 py-2 text-left text-sm font-semibold hover:bg-ink hover:text-ivory"
                >
                  <Trash2 size={15} /> Delete
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {editing ? (
        <div>
          <label className="sr-only" htmlFor={`edit-${comment._id}`}>Edit argument</label>
          <textarea
            id={`edit-${comment._id}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={MAX_ARGUMENT_LENGTH}
            rows={4}
            className="field resize-y text-sm"
            autoFocus
          />
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
            <Button size="sm" onClick={saveEdit} disabled={!draft.trim()}>Save</Button>
          </div>
        </div>
      ) : (
        <ArgumentBody content={comment.content} />
      )}

      <References references={comment.references} />

      <footer className="mt-4 flex flex-wrap items-center gap-1 border-t-2 border-ink/15 pt-3">
        <EndorseButton comment={comment} debateId={debate._id} isOwn={isOwn} onChange={(updates) => onPatch(comment._id, updates)} />
        {isOpen && (
          <>
            <button
              type="button"
              onClick={() => setComposer((c) => (c === null ? '' : null))}
              className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border-2 border-transparent px-2 text-xs font-bold hover:border-ink"
            >
              <Reply size={14} strokeWidth={2.5} aria-hidden="true" /> Reply
            </button>
            <button
              type="button"
              onClick={() => setComposer(`> ${comment.content.split('\n\n').pop().slice(0, 280)}\n\n`)}
              className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border-2 border-transparent px-2 text-xs font-bold hover:border-ink"
            >
              <Quote size={14} strokeWidth={2.5} aria-hidden="true" /> Quote
            </button>
          </>
        )}
        {replyCount > 0 && (
          <button
            type="button"
            onClick={toggleReplies}
            aria-expanded={showReplies}
            className="ml-auto inline-flex h-8 items-center gap-1 rounded-[4px] border-2 border-transparent px-2 text-xs font-extrabold hover:border-ink"
          >
            {plural(replyCount, 'reply', 'replies')}
            <ChevronDown size={14} strokeWidth={3} className={`transition-transform ${showReplies ? 'rotate-180' : ''}`} />
          </button>
        )}
      </footer>

      {composer !== null && (
        <ReplyComposer key={composer} initial={composer} onCancel={() => setComposer(null)} onSubmit={postReply} />
      )}

      {showReplies && (
        <div className="mt-4 space-y-3 border-l-4 border-ember pl-3 sm:pl-4">
          {repliesLoading && <div className="flex py-2"><Spinner size={18} /></div>}
          {replies?.map((reply) => {
            const canDeleteReply = sameId(user?._id, reply.author?._id) || sameId(user?._id, debate.creator?._id);
            return (
              <div key={reply._id} className="rounded-[4px] border-2 border-ink/15 bg-ink/[0.03] p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <Link to={`/profile/${reply.author?.username}`} className="flex min-w-0 items-center gap-2 hover:underline">
                    <Avatar src={reply.author?.profile?.avatar} username={reply.author?.username} size="xs" />
                    <span className="truncate text-xs font-extrabold">{displayName(reply.author)}</span>
                  </Link>
                  <span className="flex shrink-0 items-center gap-1.5 text-xs text-ink/70">
                    {timeAgo(reply.createdAt, { short: true })}
                    {canDeleteReply && (
                      <button type="button" onClick={() => removeReply(reply._id)} className="rounded p-0.5 hover:bg-ink hover:text-ivory" aria-label="Delete reply">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </span>
                </div>
                <ArgumentBody content={reply.content} compact />
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
});

ArgumentCard.displayName = 'ArgumentCard';
