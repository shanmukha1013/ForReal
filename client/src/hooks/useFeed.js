import { useState, useCallback, useRef } from 'react';
import { talkService } from '@/services/talkService';

export const useFeed = () => {
  const [talks, setTalks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const nextCursor = useRef(null);

  const fetchTalks = useCallback(async (isRefresh = false) => {
    if (isLoading || (!hasMore && !isRefresh)) return;

    try {
      if (isRefresh) {
        setIsRefreshing(true);
        nextCursor.current = null;
      } else {
        setIsLoading(true);
      }

      const res = await talkService.getTalks({ cursor: nextCursor.current, limit: 10 });
      
      if (res.success) {
        const { talks: newTalks, nextCursor: newCursor, hasMore: more } = res.data;
        
        setTalks(prev => isRefresh ? newTalks : [...prev, ...newTalks]);
        nextCursor.current = newCursor;
        setHasMore(more);
      }
    } catch (error) {
      console.error('Failed to fetch feed:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isLoading, hasMore]);

  const addTalkToFeed = useCallback((newTalk) => {
    setTalks(prev => [newTalk, ...prev]);
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
    fetchTalks,
    addTalkToFeed,
    removeTalkFromFeed,
    updateTalkInFeed
  };
};
