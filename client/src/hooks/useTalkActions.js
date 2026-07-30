import { useCallback, useRef } from 'react';
import { talkService } from '@/services/talkService';
import toast from 'react-hot-toast';

export const useTalkActions = (updateTalkInFeed, removeTalkFromFeed) => {
  // Track in-flight reaction requests to prevent rapid double-clicks
  const pendingReactions = useRef(new Set());

  const handleReaction = useCallback(async (talkId, type, talks) => {
    // Prevent rapid double-click spam
    const key = `${talkId}-${type}`;
    if (pendingReactions.current.has(key)) return;
    pendingReactions.current.add(key);

    const talk = talks.find(t => t._id === talkId);
    if (!talk) {
      pendingReactions.current.delete(key);
      return;
    }

    // Optimistic update: compute new counts locally
    const currentUserReaction = talk.userReaction || null;
    let newReactionsCount = { ...talk.reactionsCount };
    let newUserReaction = null;

    if (currentUserReaction === type) {
      // Toggle off
      newReactionsCount[type] = Math.max(0, (newReactionsCount[type] || 0) - 1);
      newUserReaction = null;
    } else {
      // Remove previous if any
      if (currentUserReaction) {
        newReactionsCount[currentUserReaction] = Math.max(0, (newReactionsCount[currentUserReaction] || 0) - 1);
      }
      // Add new
      newReactionsCount[type] = (newReactionsCount[type] || 0) + 1;
      newUserReaction = type;
    }

    // Apply optimistic update immediately
    updateTalkInFeed(talkId, {
      reactionsCount: newReactionsCount,
      userReaction: newUserReaction,
    });

    try {
      const res = await talkService.toggleReaction(talkId, type);
      if (res.success) {
        // Reconcile with server truth
        updateTalkInFeed(talkId, {
          reactionsCount: res.data.reactionsCount,
          userReaction: newUserReaction, // server doesn't return userReaction, keep our optimistic
        });
      }
    } catch (error) {
      console.error('Reaction failed:', error);
      // Rollback optimistic update
      updateTalkInFeed(talkId, {
        reactionsCount: talk.reactionsCount,
        userReaction: currentUserReaction,
      });
      toast.error('Could not update reaction. Please try again.');
    } finally {
      pendingReactions.current.delete(key);
    }
  }, [updateTalkInFeed]);

  const handleBookmark = useCallback(async (talkId, talks) => {
    const talk = talks ? talks.find(t => t._id === talkId) : null;
    
    // Optimistic: toggle bookmark state
    const isCurrentlyBookmarked = talk?.isBookmarked || false;
    if (talk) {
      updateTalkInFeed(talkId, {
        isBookmarked: !isCurrentlyBookmarked,
        bookmarksCount: Math.max(0, (talk.bookmarksCount || 0) + (isCurrentlyBookmarked ? -1 : 1)),
      });
    }

    try {
      const res = await talkService.toggleBookmark(talkId);
      if (res.success) {
        updateTalkInFeed(talkId, {
          bookmarksCount: res.data.bookmarksCount,
          isBookmarked: !isCurrentlyBookmarked,
        });
      }
    } catch (error) {
      console.error('Bookmark failed:', error);
      // Rollback
      if (talk) {
        updateTalkInFeed(talkId, {
          isBookmarked: isCurrentlyBookmarked,
          bookmarksCount: talk.bookmarksCount,
        });
      }
      toast.error('Could not update bookmark. Please try again.');
    }
  }, [updateTalkInFeed]);

  const handleDelete = useCallback(async (talkId) => {
    // Optimistically remove
    removeTalkFromFeed(talkId);
    try {
      await talkService.deleteTalk(talkId);
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('Failed to delete Talk. Please try again.');
      // Note: In a more robust system, we would restore the talk to the feed here.
      // For now, the user will see it's gone and can refresh.
    }
  }, [removeTalkFromFeed]);

  const handleUpdate = useCallback(async (talkId, newContent) => {
    try {
      const res = await talkService.updateTalk(talkId, { content: newContent });
      if (res.success) {
        updateTalkInFeed(talkId, { content: res.data.content, isEdited: res.data.isEdited });
      }
    } catch (error) {
      console.error('Update failed:', error);
      toast.error('Failed to update Talk. Please try again.');
    }
  }, [updateTalkInFeed]);

  return {
    handleReaction,
    handleBookmark,
    handleDelete,
    handleUpdate
  };
};
