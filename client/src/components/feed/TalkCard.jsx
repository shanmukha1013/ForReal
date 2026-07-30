import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TalkHeader } from './TalkHeader';
import { TalkContent } from './TalkContent';
import { TalkMedia } from './TalkMedia';
import { ReactionBar } from './ReactionBar';
import { CommentSection } from './CommentSection';

export const TalkCard = React.memo(({ talk, onReaction, onBookmark, onDelete, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);

  const handleCommentToggle = () => {
    setCommentsOpen(prev => !prev);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: talk.isOptimistic ? 0.7 : 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className={`bg-card-dark rounded-xl border border-border-subtle p-4 sm:p-5 hover:border-border-subtle/80 transition-colors shadow-sm mb-4 ${
        talk.isOptimistic ? 'pointer-events-none' : ''
      }`}
    >
      <TalkHeader talk={talk} onDelete={onDelete} onEdit={() => setIsEditing(true)} />
      <TalkContent talk={talk} onUpdate={onUpdate} isEditing={isEditing} setIsEditing={setIsEditing} />
      <TalkMedia media={talk.media} />
      <ReactionBar 
        talk={talk} 
        onReaction={onReaction} 
        onBookmark={onBookmark}
        onCommentToggle={handleCommentToggle}
      />
      <CommentSection 
        talk={talk} 
        isOpen={commentsOpen}
        onToggle={handleCommentToggle}
      />
    </motion.div>
  );
});

TalkCard.displayName = 'TalkCard';
