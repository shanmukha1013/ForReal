// ─────────────────────────────────────────────────────────────────────────────
// useGlobalUser.js – Hook for reactive global user state
// ─────────────────────────────────────────────────────────────────────────────
// Allows ANY component to subscribe to user updates (avatar, profile, etc.)
// When user changes, ALL components get notified immediately.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { storageCache } from '../lib/storageCache';
import api from '../api/api.js';

export function useGlobalUser() {
  const [user, setUser] = useState(storageCache.getUser());

  useEffect(() => {
    // Subscribe to user changes in storage cache
    const unsubscribe = storageCache.subscribe('user', (updatedUser) => {
      setUser(updatedUser);
    });

    return unsubscribe;
  }, []);

  // Callback to update user globally
  const updateGlobalUser = useCallback((updates) => {
    const updatedUser = storageCache.updateUser(updates);
    setUser(updatedUser);
    return updatedUser;
  }, []);

  // Save profile to backend, then update global cache
  const saveProfile = useCallback(async (updates) => {
    try {
      const currentUser = storageCache.getUser();
      const userId = currentUser?._id || currentUser?.id;
      if (!userId) {throw new Error('User ID not found');}
      const response = await api.users.updateProfile(userId, updates);
      const updatedUser = response.user || response;
      storageCache.setUser(updatedUser);
      setUser(updatedUser);
      return updatedUser;
    } catch (err) {
      console.error('[useGlobalUser] saveProfile error:', err);
      throw err;
    }
  }, []);

  return {
    user,
    updateGlobalUser,
    saveProfile,
    isAuthenticated: !!user && !!user.username,
  };
}

export default useGlobalUser;
