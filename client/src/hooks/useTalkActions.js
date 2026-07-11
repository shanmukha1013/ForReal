import { useCallback } from 'react';
import { talkService } from '@/services/talkService';

export const useTalkActions = (updateTalkInFeed, removeTalkFromFeed) => {

  const handleReaction = useCallback(async (talkId, type, talks) => {
    const talk = talks.find(t => t._id === talkId);
    if (!talk) return;

    // We don't have the current user's reaction readily available locally without more complex state
    // So we will just call the API and update the counts based on the response to ensure accuracy
    // Optimistic UI for reactions requires knowing exactly what to toggle. We'll do a quick API call 
    // and update. For a truly optimistic approach, we'd need to store userReactions locally.
    
    try {
      const res = await talkService.toggleReaction(talkId, type);
      if (res.success) {
        // Update the talk with the new data from server
        updateTalkInFeed(talkId, { reactionsCount: res.data.reactionsCount });
      }
    } catch (error) {
      console.error('Reaction failed:', error);
    }
  }, [updateTalkInFeed]);

  const handleBookmark = useCallback(async (talkId) => {
    try {
      const res = await talkService.toggleBookmark(talkId);
      if (res.success) {
        updateTalkInFeed(talkId, { bookmarksCount: res.data.bookmarksCount });
      }
    } catch (error) {
      console.error('Bookmark failed:', error);
    }
  }, [updateTalkInFeed]);

  const handleDelete = useCallback(async (talkId) => {
    // Optimistically remove
    removeTalkFromFeed(talkId);
    try {
      await talkService.deleteTalk(talkId);
    } catch (error) {
      console.error('Delete failed:', error);
      // In a robust app, we'd rollback the deletion here
      alert('Failed to delete talk');
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
    }
  }, [updateTalkInFeed]);

  return {
    handleReaction,
    handleBookmark,
    handleDelete,
    handleUpdate
  };
};
