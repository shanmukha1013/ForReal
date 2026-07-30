import React from 'react';
import { Heart, ThumbsDown, CheckCircle, XCircle, MessageCircle, Bookmark, Link2 } from 'lucide-react';
import toast from 'react-hot-toast';

const REACTION_CONFIG = {
  like:     { icon: Heart,       label: 'Like',     activeColor: 'text-primary-bright', activeBg: 'bg-primary/10' },
  dislike:  { icon: ThumbsDown,  label: 'Dislike',  activeColor: 'text-primary',        activeBg: 'bg-primary/5' },
  agree:    { icon: CheckCircle, label: 'Agree',    activeColor: 'text-white',          activeBg: 'bg-white/10' },
  disagree: { icon: XCircle,     label: 'Disagree', activeColor: 'text-text-muted',     activeBg: 'bg-bg-dark' },
};

export const ReactionBar = React.memo(({ talk, onReaction, onBookmark, onCommentToggle }) => {
  const userReaction = talk.userReaction || null;
  const isBookmarked = talk.isBookmarked || false;

  const handleShare = async () => {
    const url = `${window.location.origin}/talks/${talk._id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'ForReal Talk',
          text: `Check out this Talk by @${talk.author?.username}`,
          url,
        });
      } catch (err) {
        // User cancelled share — not an error
        if (err.name !== 'AbortError') {
          navigator.clipboard.writeText(url).then(() => {
            toast.success('Talk link copied.');
          });
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast.success('Talk link copied.');
      } catch {
        toast.error('Could not copy link.');
      }
    }
  };

  return (
    <div className="flex items-center justify-between border-t border-border-subtle pt-3 mt-2">
      {/* Left: Reactions + Comments */}
      <div className="flex items-center gap-1 sm:gap-2">
        {Object.entries(REACTION_CONFIG).map(([type, config]) => {
          const Icon = config.icon;
          const isActive = userReaction === type;
          const count = talk.reactionsCount?.[type] || 0;
          
          return (
            <button
              key={type}
              onClick={() => onReaction(talk._id, type)}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-full text-sm font-medium transition-all duration-150 group ${
                isActive
                  ? `${config.activeColor} ${config.activeBg}`
                  : 'text-text-muted hover:text-white hover:bg-white/5'
              }`}
              aria-label={`${config.label}: ${count}`}
              aria-pressed={isActive}
              title={config.label}
            >
              <Icon 
                size={16} 
                className={`transition-transform group-active:scale-110 ${isActive ? 'fill-current' : ''}`}
                strokeWidth={isActive ? 2.5 : 2}
              />
              {count > 0 && (
                <span className="text-xs tabular-nums">{count}</span>
              )}
            </button>
          );
        })}
        
        {/* Comment button */}
        <button 
          onClick={() => onCommentToggle && onCommentToggle()}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-full text-sm font-medium text-text-muted hover:text-primary hover:bg-primary/10 transition-all duration-150 group"
          aria-label={`Comments: ${talk.commentsCount || 0}`}
          title="Comment"
        >
          <MessageCircle size={16} strokeWidth={2} className="group-active:scale-110 transition-transform" />
          {talk.commentsCount > 0 && (
            <span className="text-xs tabular-nums">{talk.commentsCount}</span>
          )}
        </button>
      </div>

      {/* Right: Bookmark + Share */}
      <div className="flex items-center gap-1">
        <button 
          onClick={() => onBookmark(talk._id)}
          className={`p-2 rounded-full transition-all duration-150 group ${
            isBookmarked
              ? 'text-primary bg-primary/10'
              : 'text-text-muted hover:text-primary hover:bg-primary/10'
          }`}
          aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
          aria-pressed={isBookmarked}
          title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
        >
          <Bookmark 
            size={16} 
            strokeWidth={isBookmarked ? 2.5 : 2}
            className={`transition-transform group-active:scale-110 ${isBookmarked ? 'fill-current' : ''}`}
          />
        </button>
        
        <button 
          onClick={handleShare}
          className="p-2 text-text-muted hover:text-primary hover:bg-primary/10 rounded-full transition-all duration-150 group"
          aria-label="Share Talk"
          title="Share"
        >
          <Link2 size={16} strokeWidth={2} className="group-active:scale-110 transition-transform" />
        </button>
      </div>
    </div>
  );
});

ReactionBar.displayName = 'ReactionBar';
