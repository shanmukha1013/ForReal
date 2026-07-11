import React from 'react';
import { motion } from 'framer-motion';
import { TalkHeader } from './TalkHeader';
import { TalkContent } from './TalkContent';
import { TalkMedia } from './TalkMedia';
import { ReactionBar } from './ReactionBar';
import { CommentSection } from './CommentSection';

export const TalkCard = React.memo(({ talk, onReaction, onBookmark, onDelete, onUpdate }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-card-dark rounded-xl border border-border-subtle p-4 sm:p-5 hover:border-border-muted transition-property-common shadow-sm mb-4"
    >
      <TalkHeader talk={talk} onDelete={onDelete} />
      <TalkContent talk={talk} onUpdate={onUpdate} />
      <TalkMedia media={talk.media} />
      <ReactionBar talk={talk} onReaction={onReaction} onBookmark={onBookmark} />
      <CommentSection talk={talk} />
    </motion.div>
  );
});

TalkCard.displayName = 'TalkCard';
