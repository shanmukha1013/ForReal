// -----------------------------------------------------------------------------
// useGlobalPosts.js � Hook for reactive global post/talks management with API integration
// -----------------------------------------------------------------------------
// Ensures post creation instantly reflects across feed without manual refresh.
// Subscribers get notified of post additions and updates.
// Now integrates with MongoDB-driven backend API.
// -----------------------------------------------------------------------------

import { useState, useEffect, useCallback, useRef } from 'react';
import { storageCache } from '../lib/storageCache';
import { fetchPosts, createPost as apiCreatePost, reactToPost as apiReactToPost, deletePost as apiDeletePost } from '../api/posts';

export function useGlobalPosts() {
  const [posts, setPosts] = useState(storageCache.getPosts());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const hasFetched = useRef(false);

  // Subscribe to posts changes in storage cache
  useEffect(() => {
    const unsubscribe = storageCache.subscribe('posts', (updatedPosts) => {
      setPosts(updatedPosts || []);
    });

    return unsubscribe;
  }, []);

  // Fetch posts from API on mount
  useEffect(() => {
    if (hasFetched.current) return;

    const loadPosts = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchPosts({ page: 1, limit: 20 });
        storageCache.setPosts(response.posts ?? []);
      } catch (err) {
        console.error('[useGlobalPosts] Failed to fetch posts:', err);
        setError(err?.message ?? 'Failed to load posts');
      } finally {
        setLoading(false);
        hasFetched.current = true;
      }
    };

    loadPosts();
  }, []);


  // Create a new post (backend-driven; no mock fallback)
  const createPost = useCallback(async (postData) => {
    setError(null);
    try {
      const newPost = await apiCreatePost(postData);
      storageCache.addPost(newPost);
      return newPost;
    } catch (err) {
      console.error('[useGlobalPosts] Failed to create post:', err);
      setError(err?.message ?? 'Failed to create post');
      throw err;
    }
  }, []);


  // Update an existing post
  const updatePost = useCallback((postId, updates) => {
    const updated = storageCache.updatePost(postId, updates);
    setPosts(updated);
    return updated;
  }, []);

  // Delete a post (API + localStorage)
  const deletePost = useCallback(async (postId) => {
    setError(null);
    try {
      await apiDeletePost(postId);
    } catch (err) {
      console.error('[useGlobalPosts] Failed to delete post:', err);
      setError(err.message);
    }
    // Always update localStorage
    const updated = storageCache.deletePost(postId);
    setPosts(updated);
    return updated;
  }, []);

  // React to a post
  const reactToPost = useCallback(async (postId, reactionType) => {
    setError(null);
    try {
      return await apiReactToPost(postId, reactionType);
    } catch (err) {
      console.error('[useGlobalPosts] Failed to react:', err);
      setError(err.message);
      throw err;
    }
  }, []);

  // Optimistic update: show immediately, but do not fabricate stable IDs or content.
  // Caller should replace with confirmed server response.
  const optimisticAddPost = useCallback((postData) => {
    const optimistic = {
      _id: `temp_${Date.now()}`,
      _isOptimistic: true,
      ...postData,
    };

    const currentPosts = storageCache.getPosts();
    const updated = [optimistic, ...currentPosts];
    storageCache.setPosts(updated);
    setPosts(updated);

    return optimistic;
  }, []);


  // Replace optimistic post with real post from server
  const confirmPost = useCallback((optimisticId, realPost) => {
    const currentPosts = storageCache.getPosts();
    const updated = currentPosts.map((p) => (p._id === optimisticId ? realPost : p));
    storageCache.setPosts(updated);
    setPosts(updated);
  }, []);


  // Refresh posts from API
  const refreshPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchPosts({ page: 1, limit: 20 });
      if (response.posts?.length) {
        storageCache.setPosts(response.posts);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    posts,
    loading,
    error,
    createPost,
    updatePost,
    deletePost,
    reactToPost,
    optimisticAddPost,
    confirmPost,
    refreshPosts,
  };
}

export default useGlobalPosts;
