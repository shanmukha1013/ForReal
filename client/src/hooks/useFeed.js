import { useState, useCallback, useRef } from 'react';
import { talkService } from '@/services/talkService';

export const useFeed = () => {
  const [talks, setTalks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [feedError, setFeedError] = useState(null);
  
  const nextCursor = useRef(null);
  const isFetchingRef = useRef(false);
  const hasMoreRef = useRef(true);

  const fetchTalks = useCallback(async (isRefresh = false) => {
    if (isFetchingRef.current || (!hasMoreRef.current && !isRefresh)) return;

    try {
      if (isRefresh) {
        setIsRefreshing(true);
        setFeedError(null);
        nextCursor.current = null;
        hasMoreRef.current = true;
      } else {
        setIsLoading(true);
        setFeedError(null);
      }
      isFetchingRef.current = true;

      const res = await talkService.getTalks({ cursor: nextCursor.current, limit: 10 });
      
      if (res.success) {
        const { talks: newTalks, nextCursor: newCursor, hasMore: more } = res.data;
        
        setTalks(prev => isRefresh ? newTalks : [...prev, ...newTalks]);
        nextCursor.current = newCursor;
        hasMoreRef.current = more;
        setHasMore(more);
        setFeedError(null);
      }
    } catch (error) {
      console.error('Failed to fetch feed:', error);
      setFeedError(error.message || 'We couldn\'t refresh your feed right now. Retrying...');
      
      // Auto-retry once after 3 seconds if not refreshing
      if (!isRefresh) {
        setTimeout(() => {
          isFetchingRef.current = false;
          fetchTalks(false);
        }, 3000);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      isFetchingRef.current = false;
    }
  }, []);

  /**
   * addTalkToFeed — handles three cases:
   * 1. Plain new talk: prepend to feed
   * 2. { replaceId } set: replace the optimistic placeholder with the real server talk
   * 3. { removeId } set: remove an optimistic placeholder on rollback
   */
  const addTalkToFeed = useCallback((newTalk) => {
    if (newTalk.removeId) {
      // Rollback: remove optimistic talk by its temp ID
      setTalks(prev => prev.filter(t => t._id !== newTalk.removeId));
      return;
    }

    if (newTalk.replaceId) {
      // Reconcile: replace the optimistic talk with the real server talk
      setTalks(prev => {
        const exists = prev.some(t => t._id === newTalk._id);
        if (exists) {
          // Real talk already in feed somehow — just remove the optimistic one
          return prev.filter(t => t._id !== newTalk.replaceId);
        }
        return prev.map(t => t._id === newTalk.replaceId ? { ...newTalk } : t);
      });
      return;
    }

    // Standard prepend (optimistic or fresh talk)
    setTalks(prev => {
      // Prevent duplicate if somehow the same _id already exists
      if (prev.some(t => t._id === newTalk._id)) return prev;
      return [newTalk, ...prev];
    });
  }, []);

  const removeTalkFromFeed = useCallback((talkId) => {
    setTalks(prev => prev.filter(t => t._id !== talkId));
  }, []);

  const updateTalkInFeed = useCallback((talkId, updatedData) => {
    setTalks(prev => prev.map(t => t._id === talkId ? { ...t, ...updatedData } : t));
  }, []);

  return {
    talks,
    setTalks,
    isLoading,
    hasMore,
    isRefreshing,
    feedError,
    fetchTalks,
    addTalkToFeed,
    removeTalkFromFeed,
    updateTalkInFeed
  };
};
