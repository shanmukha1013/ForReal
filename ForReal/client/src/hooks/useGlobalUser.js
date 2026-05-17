// ─────────────────────────────────────────────────────────────────────────────
// useGlobalUser.js – Hook for reactive global user state
// ─────────────────────────────────────────────────────────────────────────────
// Allows ANY component to subscribe to user updates (avatar, profile, etc.)
// When user changes, ALL components get notified immediately.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { storageCache } from '../lib/storageCache';

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

  return {
    user,
    updateGlobalUser,
    isAuthenticated: !!user && !!user.username,
  };
}

export default useGlobalUser;
