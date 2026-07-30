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
  const retryTimeoutRef = useRef(null);
  const retryCountRef = useRef(0);

  const fetchTalks = useCallback(async (isRefresh = false) => {
    if (isFetchingRef.current) return;
    if (!hasMoreRef.current && !isRefresh) return;

    // Clear any pending retry
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    isFetchingRef.current = true;

    try {
      if (isRefresh) {
        setIsRefreshing(true);
        setFeedError(null);
        nextCursor.current = null;
        hasMoreRef.current = true;
        retryCountRef.current = 0;
      } else {
        setIsLoading(true);
        setFeedError(null);
      }

      const res = await talkService.getTalks({ cursor: nextCursor.current, limit: 10 });

      if (res.success) {
        const { talks: newTalks, nextCursor: newCursor, hasMore: more } = res.data;

        setTalks(prev => isRefresh ? newTalks : [...prev, ...newTalks]);
        nextCursor.current = newCursor;
        hasMoreRef.current = more;
        setHasMore(more);
        setFeedError(null);
        retryCountRef.current = 0;
      }
    } catch (error) {
      console.error('Failed to fetch feed:', error);
      setFeedError(error.message || 'Your feed is taking a moment. Retrying...');

      // Exponential backoff retry — max 3 retries, cap at 15s
      if (retryCountRef.current < 3) {
        const delay = Math.min(3000 * Math.pow(2, retryCountRef.current), 15000);
        retryCountRef.current += 1;
        retryTimeoutRef.current = setTimeout(() => {
          isFetchingRef.current = false;
          fetchTalks(false);
        }, delay);
        // Don't fall through to isFetchingRef = false so we block new calls during backoff
        if (isRefresh) setIsRefreshing(false);
        setIsLoading(false);
        return;
      }
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const addTalkToFeed = useCallback((newTalk) => {
    if (newTalk.removeId) {
      setTalks(prev => prev.filter(t => t._id !== newTalk.removeId));
      return;
    }

    if (newTalk.replaceId) {
      setTalks(prev => {
        const exists = prev.some(t => t._id === newTalk._id);
        if (exists) {
          return prev.filter(t => t._id !== newTalk.replaceId);
        }
        return prev.map(t => t._id === newTalk.replaceId ? { ...newTalk } : t);
      });
      return;
    }

    setTalks(prev => {
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
