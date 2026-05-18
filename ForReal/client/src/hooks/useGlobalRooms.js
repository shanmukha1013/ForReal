// ─────────────────────────────────────────────────────────────────────────────
// useGlobalRooms.js – Hook for reactive global rooms/debates management
// ─────────────────────────────────────────────────────────────────────────────
// Ensures room creation instantly propagates across app. Subscribers
// get notified when rooms are created, updated, or deleted.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { storageCache } from '../lib/storageCache';
import api from '../api/axios.js';

export function useGlobalRooms() {
  const [rooms, setRooms] = useState(storageCache.getRooms());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);


  useEffect(() => {
    // Subscribe to rooms changes in storage cache
    const unsubscribe = storageCache.subscribe('rooms', (updatedRooms) => {
      setRooms(updatedRooms || []);
    });

    return unsubscribe;
  }, []);

  // Fetch all rooms from API
  const fetchRooms = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.rooms.getAll(params);
      // Determine if response is an array or object wrapping an array
      const roomList = Array.isArray(response) ? response : (response.rooms || []);
      storageCache.setRooms(roomList);
    } catch (err) {
      console.error('[useGlobalRooms] Failed to fetch rooms:', err);
      setError(err?.message || 'Failed to load rooms');
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a new room
  const createRoom = useCallback(async (roomData) => {
    setError(null);
    try {
      const response = await api.rooms.create(roomData);
      const newRoom = response.room || response;
      
      // Ensure required fallback fields for UI assumptions
      if (!newRoom.participants) newRoom.participants = roomData.participants || [];
      if (!newRoom.messages) newRoom.messages = [];
      if (!newRoom.status) newRoom.status = 'active';

      const updated = storageCache.addRoom(newRoom);
      setRooms(updated);
      return newRoom;
    } catch (err) {
      console.error('[useGlobalRooms] Failed to create room:', err);
      setError(err?.message || 'Failed to create room');
      throw err;
    }
  }, []);

  // Update an existing room
  const updateRoom = useCallback((roomId, updates) => {
    const updated = storageCache.updateRoom(roomId, updates);
    setRooms(updated);
  }, []);

  // Delete a room
  const deleteRoom = useCallback((roomId) => {
    const updated = storageCache.deleteRoom(roomId);
    setRooms(updated);
  }, []);

  // Optimistic create: immediately show room while API processes
  const optimisticCreateRoom = useCallback((roomData) => {
    const newRoom = {
      _id: `room_${Date.now()}_temp`,
      ...roomData,
      createdAt: new Date().toISOString(),
      participants: roomData.participants || [],
      messages: [],
      status: 'active',
      _isOptimistic: true, // Mark as pending
    };

    const currentRooms = storageCache.getRooms();
    const updated = [newRoom, ...currentRooms];
    storageCache.setRooms(updated);
    setRooms(updated);

    return newRoom;
  }, []);

  // Replace optimistic room with real room from server
  const confirmRoom = useCallback((optimisticId, realRoom) => {
    const currentRooms = storageCache.getRooms();
    const updated = currentRooms.map((r) =>
      r._id === optimisticId ? realRoom : r
    );
    storageCache.setRooms(updated);
    setRooms(updated);
  }, []);

  // Join an existing room via API
  const joinRoom = useCallback(async (roomId) => {
    try {
      await api.rooms.join(roomId);
    } catch (err) {
      console.warn(`[useGlobalRooms] Failed to join room API:`, err);
      // Socket handles real-time fallbacks, no throw required
    }
  }, []);

  // Leave a room via API
  const leaveRoom = useCallback(async (roomId) => {
    try {
      await api.rooms.leave(roomId);
    } catch (err) {
      console.warn(`[useGlobalRooms] Failed to leave room API:`, err);
    }
  }, []);

  return {
    rooms,
    loading,
    error,
    fetchRooms,
    createRoom,
    updateRoom,
    deleteRoom,
    optimisticCreateRoom,
    confirmRoom,
    joinRoom,
    leaveRoom,
  };
}

export default useGlobalRooms;
