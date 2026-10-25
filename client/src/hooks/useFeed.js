import { useState, useCallback, useRef } from 'react';
import { talkService } from '@/services/talkService';

// Cursor-paginated talk feed. Filters (author, hashtag) are fixed per hook
// instance; refresh() reloads from the top.
export const useFeed = ({ author, hashtag, limit = 10 } = {}) => {
  const [talks, setTalks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const cursorRef = useRef(null);
  const inFlightRef = useRef(false);
  const hasMoreRef = useRef(true);
  const requestIdRef = useRef(0);

  const fetchTalks = useCallback(async ({ refresh = false } = {}) => {
    if (inFlightRef.current && !refresh) return;
    if (!refresh && !hasMoreRef.current) return;

    const requestId = ++requestIdRef.current;
    inFlightRef.current = true;
    setIsLoading(true);
    setError(null);
    if (refresh) cursorRef.current = null;

    try {
      const res = await talkService.getTalks({ cursor: cursorRef.current, limit, author, hashtag });
      if (requestId !== requestIdRef.current) return; // a newer request superseded this one
      const { talks: page, nextCursor, hasMore: more } = res.data;
      setTalks((prev) => {
        if (refresh) return page;
        const seen = new Set(prev.map((t) => t._id));
        return [...prev, ...page.filter((t) => !seen.has(t._id))];
      });
      cursorRef.current = nextCursor;
      hasMoreRef.current = more;
      setHasMore(more);
    } catch (err) {
      if (requestId === requestIdRef.current) setError(err.message);
    } finally {
      if (requestId === requestIdRef.current) {
        inFlightRef.current = false;
        setIsLoading(false);
        setHasLoaded(true);
      }
    }
  }, [author, hashtag, limit]);

  const prependTalk = useCallback((talk) => {
    setTalks((prev) => (prev.some((t) => t._id === talk._id) ? prev : [talk, ...prev]));
  }, []);

  const replaceTalk = useCallback((tempId, talk) => {
    setTalks((prev) => prev.map((t) => (t._id === tempId ? talk : t)));
  }, []);

  const removeTalk = useCallback((talkId) => {
    setTalks((prev) => prev.filter((t) => t._id !== talkId));
  }, []);

  const updateTalk = useCallback((talkId, updates) => {
    setTalks((prev) => prev.map((t) => (t._id === talkId ? { ...t, ...updates } : t)));
  }, []);

  return {
    talks,
    setTalks,
    isLoading,
    hasMore,
    hasLoaded,
    error,
    fetchTalks,
    prependTalk,
    replaceTalk,
    removeTalk,
    updateTalk,
  };
};
