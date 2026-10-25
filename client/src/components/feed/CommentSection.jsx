import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Send, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { talkService } from '@/services/talkService';
import useAuthStore from '@/store/useAuthStore';
import { confirmAction } from '@/store/useConfirmStore';
import { Avatar } from '@/components/ui/Avatar';
import { Spinner } from '@/components/ui/Spinner';
import { timeAgo, sameId } from '@/lib/format';
import { RichText } from './TalkContent';

export const CommentSection = ({ talk, onCountChange }) => {
  const user = useAuthStore((s) => s.user);
  const [comments, setComments] = useState([]);
  const [status, setStatus] = useState('loading');
  const [draft, setDraft] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef(null);
  const isTalkOwner = sameId(user?._id, talk.author?._id);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const res = await talkService.getComments(talk._id);
      setComments(res.data || []);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [talk._id]);

  useEffect(() => {
    load();
    inputRef.current?.focus({ preventScroll: true });
  }, [load]);

  const submit = async (e) => {
    e?.preventDefault();
    const content = draft.trim();
    if (!content || isSubmitting) return;

    const tempId = `temp-${Date.now()}`;
    setComments((prev) => [...prev, { _id: tempId, author: user, content, createdAt: new Date().toISOString(), isOptimistic: true }]);
    setDraft('');
    setIsSubmitting(true);
    onCountChange(1);

    try {
      const res = await talkService.addComment(talk._id, content);
      setComments((prev) => prev.map((c) => (c._id === tempId ? res.data : c)));
    } catch (error) {
      setComments((prev) => prev.filter((c) => c._id !== tempId));
      setDraft(content);
      onCountChange(-1);
      toast.error(error.message || 'Could not post your comment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const remove = async (commentId) => {
    const ok = await confirmAction({ title: 'Delete comment?', message: 'This cannot be undone.', confirmLabel: 'Delete', tone: 'danger' });
    if (!ok) return;
    const snapshot = comments;
    setComments((prev) => prev.filter((c) => c._id !== commentId));
    onCountChange(-1);
    try {
      await talkService.deleteComment(talk._id, commentId);
    } catch (error) {
      setComments(snapshot);
      onCountChange(1);
      toast.error(error.message || 'Could not delete the comment.');
    }
  };

  return (
    <div className="mt-3 border-t-2 border-ink/15 pt-3 animate-fade">
      {status === 'loading' && (
        <div className="flex justify-center py-3"><Spinner size={18} /></div>
      )}
      {status === 'error' && (
        <p className="py-2 text-center text-sm">
          Comments didn’t load. <button type="button" className="font-bold underline" onClick={load}>Retry</button>
        </p>
      )}
      {status === 'ready' && comments.length === 0 && (
        <p className="py-2 text-center text-sm text-ink/70">No replies yet. Make the first point.</p>
      )}

      <ul className="space-y-3">
        {comments.map((comment) => {
          const canDelete = !comment.isOptimistic && (sameId(user?._id, comment.author?._id) || isTalkOwner);
          return (
            <li key={comment._id} className={`flex gap-2.5 ${comment.isOptimistic ? 'opacity-60' : ''}`}>
              <Avatar src={comment.author?.profile?.avatar} username={comment.author?.username} size="sm" />
              <div className="min-w-0 flex-1 rounded-[4px] border-2 border-ink/15 bg-ink/[0.03] px-3 py-2">
                <div className="mb-0.5 flex items-center justify-between gap-2">
                  <Link to={`/profile/${comment.author?.username}`} className="truncate text-xs font-extrabold hover:underline">
                    @{comment.author?.username}
                  </Link>
                  <div className="flex shrink-0 items-center gap-1.5 text-xs text-ink/70">
                    <time dateTime={comment.createdAt}>{timeAgo(comment.createdAt, { short: true })}</time>
                    {canDelete && (
                      <button type="button" onClick={() => remove(comment._id)} className="rounded p-0.5 hover:bg-ember" aria-label="Delete comment">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
                <RichText text={comment.content} className="text-sm leading-relaxed" />
              </div>
            </li>
          );
        })}
      </ul>

      <form onSubmit={submit} className="mt-3 flex items-end gap-2">
        <label htmlFor={`comment-${talk._id}`} className="sr-only">Write a comment</label>
        <textarea
          ref={inputRef}
          id={`comment-${talk._id}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) submit(e);
          }}
          rows={1}
          maxLength={1000}
          placeholder="Reply with a reason…"
          className="field max-h-32 min-h-10 resize-none py-2 text-sm"
        />
        <button
          type="submit"
          disabled={!draft.trim() || isSubmitting}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[4px] border-2 border-ink bg-ember text-ink disabled:opacity-40"
          aria-label="Post comment"
        >
          {isSubmitting ? <Spinner size={16} /> : <Send size={16} />}
        </button>
      </form>
    </div>
  );
};
