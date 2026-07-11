import React from 'react';
import { Heart, ThumbsDown, CheckCircle, XCircle, MessageCircle, Bookmark, Share } from 'lucide-react';

export const ReactionBar = React.memo(({ talk, onReaction, onBookmark }) => {
  // Using generic states, optimistic updates handled by parent or context
  // Here we just dispatch
  const handleReaction = (type) => {
    onReaction(talk._id, type);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/talks/${talk._id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'ForReal Talk',
          text: `Check out this talk by ${talk.author.username}`,
          url: url,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(url);
      // Need a toast here ideally
      alert('Link copied to clipboard!');
    }
  };

  const ReactionButton = ({ type, icon: Icon, colorClass }) => {
    // In a real app we need to know the current user's reaction from the backend
    // For now we'll rely on counts
    const count = talk.reactionsCount[type] || 0;
    
    return (
      <button 
        onClick={() => handleReaction(type)}
        className={`flex items-center gap-1.5 text-text-muted hover:${colorClass} transition-colors group p-2 -ml-2 rounded-full`}
      >
        <div className="relative">
          <Icon size={18} className="group-hover:scale-110 transition-transform" />
        </div>
        {count > 0 && <span className="text-sm font-medium">{count}</span>}
      </button>
    );
  };

  return (
    <div className="flex items-center justify-between border-t border-border-subtle pt-3 mt-2">
      <div className="flex items-center gap-4 sm:gap-6">
        <ReactionButton type="like" icon={Heart} colorClass="text-error" />
        <ReactionButton type="dislike" icon={ThumbsDown} colorClass="text-primary" />
        <ReactionButton type="agree" icon={CheckCircle} colorClass="text-success" />
        <ReactionButton type="disagree" icon={XCircle} colorClass="text-warning" />
        
        <button className="flex items-center gap-1.5 text-text-muted hover:text-primary transition-colors group p-2 rounded-full">
          <MessageCircle size={18} className="group-hover:scale-110 transition-transform" />
          {talk.commentsCount > 0 && <span className="text-sm font-medium">{talk.commentsCount}</span>}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button 
          onClick={() => onBookmark(talk._id)}
          className="p-2 text-text-muted hover:text-primary rounded-full transition-colors group"
        >
          <Bookmark size={18} className="group-hover:scale-110 transition-transform" />
        </button>
        <button 
          onClick={handleShare}
          className="p-2 text-text-muted hover:text-primary rounded-full transition-colors group"
        >
          <Share size={18} className="group-hover:scale-110 transition-transform" />
        </button>
      </div>
    </div>
  );
});

ReactionBar.displayName = 'ReactionBar';
