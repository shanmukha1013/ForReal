// ─────────────────────────────────────────────────────────────────────────────
// useGlobalNotifications.js – Hook for reactive notifications management
// ─────────────────────────────────────────────────────────────────────────────
// Ensures notifications update in real-time across all components.
// Subscribers get notified when notifications arrive, are read, or deleted.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { storageCache } from '../lib/storageCache';
import { getSocket } from '../realtime/socket';
import axios from '../api/axios';

export function useGlobalNotifications() {
  const [notifications, setNotifications] = useState(storageCache.getNotifications());
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Subscribe to notifications changes (cache-level)
    const unsubscribe = storageCache.subscribe('notifications', (updatedNotifications) => {
      setNotifications(updatedNotifications || []);
      const count = (updatedNotifications || []).filter((n) => !n.read).length;
      setUnreadCount(count);
    });

    const initialCount = (storageCache.getNotifications() || []).filter((n) => !n.read).length;
    setUnreadCount(initialCount);

    return unsubscribe;
  }, []);

  // Realtime + persisted sync from backend
  useEffect(() => {
    let cancelled = false;

    const sync = async () => {
      try {
        const res = await axios.get('/chat/notifications');
        if (cancelled) return;
        const list = (res.data || []).map((n) => ({
          ...n,
          read: Boolean(n.read),
        }));
        storageCache.setNotifications(list);
      } catch {
        // keep existing cache
      }
    };

    sync();

    const socket = getSocket();
    const onNew = (notif) => {
      storageCache.addNotification({
        ...notif,
        read: false,
        createdAt: notif?.createdAt || new Date().toISOString(),
      });
    };

    socket.on('notifications:new', onNew);

    return () => {
      cancelled = true;
      socket.off('notifications:new', onNew);
    };
  }, []);


  // Add a new notification
  const addNotification = useCallback((notifData) => {
    const newNotif = {
      _id: `notif_${Date.now()}`,
      ...notifData,
      read: false,
      createdAt: new Date().toISOString(),
    };

    const updated = storageCache.addNotification(newNotif);
    setNotifications(updated);
    setUnreadCount((prev) => prev + 1);
    return newNotif;
  }, []);

  // Mark notification as read
  const markAsRead = useCallback((notificationId) => {
    const currentNotifs = storageCache.getNotifications();
    const isCurrentlyUnread = currentNotifs.find((n) => n._id === notificationId)?.read === false;

    storageCache.markNotificationAsRead(notificationId);
    if (isCurrentlyUnread) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    const currentNotifs = storageCache.getNotifications();
    const unreadNotifs = currentNotifs.filter((n) => !n.read);

    unreadNotifs.forEach((n) => {
      storageCache.markNotificationAsRead(n._id);
    });

    setUnreadCount(0);
  }, []);

  // Delete a notification
  const deleteNotification = useCallback((notificationId) => {
    const currentNotifs = storageCache.getNotifications();
    const wasUnread = currentNotifs.find((n) => n._id === notificationId)?.read === false;

    storageCache.deleteNotification(notificationId);
    if (wasUnread) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    storageCache.setNotifications([]);
    setUnreadCount(0);
  }, []);

  return {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  };
}

export default useGlobalNotifications;
