import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useContext,
  useMemo,
} from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  PlusCircleIcon,
  XMarkIcon,
  ArrowTrendingUpIcon,
  SparklesIcon,
  MapIcon,
  UserGroupIcon,
  ArrowTopRightOnSquareIcon,
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

// Backward-compatible icon aliases
const PlusCircle = PlusCircleIcon;
const X = XMarkIcon;
const TrendingUp = ArrowTrendingUpIcon;
const Zap = SparklesIcon;
const Compass = MapIcon;
const Users = UserGroupIcon;
const ArrowUpRight = ArrowTopRightOnSquareIcon;
const MessageSquare = ChatBubbleLeftRightIcon;
const Send = PaperAirplaneIcon;
const RefreshCw = ArrowPathIcon;
import Layout from '../components/Layout';
import PostCard from '../components/PostCard';
import { AuthContext } from '../context/AuthContext';
import { useNotification } from '../components/Notification';
import axios from '../api/axios';
import { storageCache } from '../lib/storageCache';
import { createPost as apiCreatePost, fetchPosts as apiFetchPosts } from '../api/posts';

// Custom Hook: useFeed - Fetch talks with infinite scroll
const useFeed = (limit = 10) => {
  const [talks, setTalks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const pageRef = useRef(1);
  const abortRef = useRef(null);

  const fetchTalks = useCallback(
    async (page = 1, append = false) => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const isInitial = page === 1 && !append;
      if (isInitial) setLoading(true);
      else setLoadingMore(true);

      let fetchedTalks = [];
      try {
        // Try API first
        try {
          const { posts, pagination } = await apiFetchPosts({ page, limit });
          fetchedTalks = posts || [];
          setHasMore(pagination?.hasMore ?? false);
        } catch (apiErr) {
          // Fallback to localStorage
          fetchedTalks = storageCache.getPosts();
          setHasMore(false);
        }
        setError(null);
      } catch (err) {
        if (axios.isCancel?.(err)) return;
        setError(err?.message || 'Failed to fetch feed');
        return;
      } finally {
        const localTalks = storageCache.getPosts();
        const allTalks = [...fetchedTalks, ...localTalks];
        const unique = Array.from(new Map(allTalks.map(t => [t._id, t])).values());
        unique.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        const paginated = unique.slice((page - 1) * limit, page * limit);
        setTalks((prev) => (append ? [...prev, ...paginated] : paginated));
        pageRef.current = page;
        if (isInitial) setLoading(false);
        else setLoadingMore(false);
      }
    },
    [limit]
  );

  useEffect(() => {
    fetchTalks(1);
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchTalks]);

  const refresh = useCallback(() => {
    fetchTalks(1);
  }, [fetchTalks]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    fetchTalks(pageRef.current + 1, true);
  }, [fetchTalks, loadingMore, hasMore]);

  return {
    talks,
    loading,
    loadingMore,
    hasMore,
    error,
    refresh,
    loadMore,
  };
};

// ... rest of Home.jsx unchanged for brevity in this update
