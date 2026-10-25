import React from 'react';
import { Check, X, Heart, ThumbsDown, MessageSquare, Bookmark, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';

// Agree/Disagree lead because ForReal is about positions, not applause.
const REACTIONS = [
  { type: 'agree', icon: Check, label: 'Agree' },
  { type: 'disagree', icon: X, label: 'Disagree' },
  { type: 'like', icon: Heart, label: 'Like' },
  { type: 'dislike', icon: ThumbsDown, label: 'Dislike' },
];

const chip = 'inline-flex h-8 items-center gap-1.5 rounded-[4px] border-2 px-2 text-xs font-bold transition-colors';

export const ReactionBar = React.memo(({ talk, onReaction, onBookmark, onComment, commentsOpen }) => {
  const share = async () => {
    const url = `${window.location.origin}/talks/${talk._id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'A talk on ForReal', url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied.');
      }
    } catch (error) {
      if (error?.name !== 'AbortError') toast.error('Could not share this talk.');
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t-2 border-ink/15 pt-3">
      <div className="flex flex-wrap items-center gap-1">
        {REACTIONS.map(({ type, icon: Icon, label }) => {
          const active = talk.userReaction === type;
          const count = talk.reactionsCount?.[type] || 0;
          return (
            <button
              key={type}
              type="button"
              onClick={() => onReaction(talk._id, type)}
              className={`${chip} ${active ? 'border-ink bg-ink text-ivory' : 'border-transparent hover:border-ink'}`}
              aria-pressed={active}
              aria-label={`${label}${count ? ` (${count})` : ''}`}
              title={label}
            >
              <Icon size={15} strokeWidth={2.5} className={active ? 'text-ember' : ''} aria-hidden="true" />
              <span className={type === 'agree' || type === 'disagree' ? 'hidden sm:inline' : 'sr-only'}>{label}</span>
              {count > 0 && <span className="tabular">{count}</span>}
            </button>
          );
        })}
        <button
          type="button"
          onClick={onComment}
          className={`${chip} ${commentsOpen ? 'border-ink' : 'border-transparent hover:border-ink'}`}
          aria-expanded={commentsOpen}
          aria-label={`Comments (${talk.commentsCount || 0})`}
        >
          <MessageSquare size={15} strokeWidth={2.5} aria-hidden="true" />
          {talk.commentsCount > 0 && <span className="tabular">{talk.commentsCount}</span>}
        </button>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onBookmark(talk._id)}
          className={`${chip} ${talk.isBookmarked ? 'border-ink bg-ink text-ivory' : 'border-transparent hover:border-ink'}`}
          aria-pressed={Boolean(talk.isBookmarked)}
          aria-label={talk.isBookmarked ? 'Remove bookmark' : 'Bookmark'}
        >
          <Bookmark size={15} strokeWidth={2.5} className={talk.isBookmarked ? 'fill-ember text-ember' : ''} aria-hidden="true" />
        </button>
        <button type="button" onClick={share} className={`${chip} border-transparent hover:border-ink`} aria-label="Share talk">
          <Share2 size={15} strokeWidth={2.5} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
});

ReactionBar.displayName = 'ReactionBar';
