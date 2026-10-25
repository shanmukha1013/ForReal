const REACTION_VERBS = {
  agree: 'agreed with your talk',
  disagree: 'disagreed with your talk',
  like: 'liked your talk',
  dislike: 'disliked your talk',
};

// Turns a notification document into readable text and a destination link.
export const describeNotification = (n) => {
  const who = n?.sender?.profile?.displayName || (n?.sender?.username ? `@${n.sender.username}` : 'Someone');
  const isDebate = n?.entityModel === 'Debate';
  const link = n?.entityModel === 'Talk'
    ? `/talks/${n.entity}`
    : isDebate
      ? `/debates/${n.entity}`
      : n?.entityModel === 'User' && n?.sender?.username
        ? `/profile/${n.sender.username}`
        : '/notifications';
  const topic = n?.message ? ` “${n.message}”` : '';

  switch (n?.type) {
    case 'follow':
      return { text: `${who} started following you`, link };
    case 'reaction':
      return { text: `${who} ${REACTION_VERBS[n.message] || 'reacted to your talk'}`, link };
    case 'comment':
      return { text: isDebate ? `${who} argued in your debate${topic}` : `${who} commented on your talk`, link };
    case 'reply':
      return { text: isDebate ? `${who} replied to your argument${topic}` : `${who} replied to your comment`, link };
    case 'like':
      return { text: isDebate ? `${who} endorsed your argument` : `${who} liked your post`, link };
    case 'debateFinished':
      return { text: `Your debate closed. ${n.message || ''}`.trim(), link };
    default:
      return { text: `${who} interacted with you`, link };
  }
};
