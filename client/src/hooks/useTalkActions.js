import { useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { talkService } from '@/services/talkService';
import { confirmAction } from '@/store/useConfirmStore';

// Optimistic talk interactions. Callbacks are stable (they read the current
// talks through a ref), so memoised TalkCards do not re-render on every
// feed change.
export const useTalkActions = ({ talks, updateTalk, removeTalk, prependTalk }) => {
  const talksRef = useRef(talks);
  talksRef.current = talks;
  const pending = useRef(new Set());

  const findTalk = (id) => talksRef.current.find((t) => t._id === id);

  const handleReaction = useCallback(async (talkId, type) => {
    if (pending.current.has(talkId)) return;
    const talk = findTalk(talkId);
    if (!talk) return;
    pending.current.add(talkId);

    const previous = { reactionsCount: talk.reactionsCount, userReaction: talk.userReaction || null };
    const counts = { like: 0, dislike: 0, agree: 0, disagree: 0, ...talk.reactionsCount };
    let next = type;
    if (previous.userReaction === type) {
      counts[type] = Math.max(0, counts[type] - 1);
      next = null;
    } else {
      if (previous.userReaction) counts[previous.userReaction] = Math.max(0, counts[previous.userReaction] - 1);
      counts[type] += 1;
    }
    updateTalk(talkId, { reactionsCount: counts, userReaction: next });

    try {
      const res = await talkService.toggleReaction(talkId, type);
      updateTalk(talkId, { reactionsCount: res.data.reactionsCount, userReaction: res.data.userReaction });
    } catch (error) {
      updateTalk(talkId, previous);
      toast.error(error.message || 'Could not save your reaction.');
    } finally {
      pending.current.delete(talkId);
    }
  }, [updateTalk]);

  const handleBookmark = useCallback(async (talkId) => {
    const talk = findTalk(talkId);
    if (!talk || pending.current.has(`b:${talkId}`)) return;
    pending.current.add(`b:${talkId}`);

    const previous = { isBookmarked: Boolean(talk.isBookmarked), bookmarksCount: talk.bookmarksCount || 0 };
    updateTalk(talkId, {
      isBookmarked: !previous.isBookmarked,
      bookmarksCount: Math.max(0, previous.bookmarksCount + (previous.isBookmarked ? -1 : 1)),
    });

    try {
      const res = await talkService.toggleBookmark(talkId);
      updateTalk(talkId, { isBookmarked: res.data.isBookmarked, bookmarksCount: res.data.bookmarksCount });
      toast.success(res.data.isBookmarked ? 'Saved to bookmarks.' : 'Removed from bookmarks.');
    } catch (error) {
      updateTalk(talkId, previous);
      toast.error(error.message || 'Could not update bookmark.');
    } finally {
      pending.current.delete(`b:${talkId}`);
    }
  }, [updateTalk]);

  const handleDelete = useCallback(async (talkId) => {
    const ok = await confirmAction({
      title: 'Delete this talk?',
      message: 'This permanently removes the talk, its reactions and every comment on it.',
      confirmLabel: 'Delete talk',
      tone: 'danger',
    });
    if (!ok) return;

    const talk = findTalk(talkId);
    const index = talksRef.current.findIndex((t) => t._id === talkId);
    removeTalk(talkId);
    try {
      await talkService.deleteTalk(talkId);
      toast.success('Talk deleted.');
    } catch (error) {
      // Restore the talk in its original position.
      if (talk && prependTalk) {
        prependTalk(talk);
        if (index > 0) toast('Restored the talk at the top of your feed.');
      }
      toast.error(error.message || 'Could not delete the talk.');
    }
  }, [removeTalk, prependTalk]);

  const handleUpdate = useCallback(async (talkId, content) => {
    const talk = findTalk(talkId);
    if (!talk) return false;
    updateTalk(talkId, { content, isEdited: true });
    try {
      const res = await talkService.updateTalk(talkId, { content });
      updateTalk(talkId, { content: res.data.content, isEdited: true, hashtags: res.data.hashtags });
      return true;
    } catch (error) {
      updateTalk(talkId, { content: talk.content, isEdited: talk.isEdited });
      toast.error(error.message || 'Could not update the talk.');
      return false;
    }
  }, [updateTalk]);

  return { handleReaction, handleBookmark, handleDelete, handleUpdate };
};
