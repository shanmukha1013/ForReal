import React, { useCallback, useState } from 'react';
import useAuthStore from '@/store/useAuthStore';
import { sameId } from '@/lib/format';
import { TalkHeader } from './TalkHeader';
import { TalkContent } from './TalkContent';
import { TalkMedia } from './TalkMedia';
import { ReactionBar } from './ReactionBar';
import { CommentSection } from './CommentSection';

export const TalkCard = React.memo(({ talk, onReaction, onBookmark, onDelete, onUpdate, onPatch, defaultCommentsOpen = false }) => {
  const userId = useAuthStore((s) => s.user?._id);
  const [isEditing, setIsEditing] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(defaultCommentsOpen);
  const isOwner = sameId(userId, talk.author?._id);

  const toggleComments = useCallback(() => setCommentsOpen((open) => !open), []);
  const handleCountChange = useCallback(
    (delta) => onPatch?.(talk._id, { commentsCount: Math.max(0, (talk.commentsCount || 0) + delta) }),
    [onPatch, talk._id, talk.commentsCount]
  );

  return (
    <article
      className={`card p-4 sm:p-5 animate-rise [content-visibility:auto] [contain-intrinsic-size:auto_220px] ${talk.isOptimistic ? 'pointer-events-none opacity-70' : ''}`}
      aria-busy={talk.isOptimistic || undefined}
    >
      <TalkHeader talk={talk} isOwner={isOwner} onEdit={() => setIsEditing(true)} onDelete={onDelete} />
      <TalkContent
        key={isEditing ? 'editing' : 'view'}
        talk={talk}
        isEditing={isEditing}
        onCancel={() => setIsEditing(false)}
        onSave={(content) => onUpdate(talk._id, content)}
      />
      <TalkMedia media={talk.media} />
      <ReactionBar
        talk={talk}
        onReaction={onReaction}
        onBookmark={onBookmark}
        onComment={toggleComments}
        commentsOpen={commentsOpen}
      />
      {commentsOpen && !talk.isOptimistic && <CommentSection talk={talk} onCountChange={handleCountChange} />}
    </article>
  );
});

TalkCard.displayName = 'TalkCard';
