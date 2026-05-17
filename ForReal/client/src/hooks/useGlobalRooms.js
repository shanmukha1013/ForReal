// ─────────────────────────────────────────────────────────────────────────────
// useGlobalRooms.js – Hook for reactive global rooms/debates management
// ─────────────────────────────────────────────────────────────────────────────
// Ensures room creation instantly propagates across app. Subscribers
// get notified when rooms are created, updated, or deleted.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { storageCache } from '../lib/storageCache';

export function useGlobalRooms() {
  const [rooms, setRooms] = useState(storageCache.getRooms());


  useEffect(() => {
    // Subscribe to rooms changes in storage cache
    const unsubscribe = storageCache.subscribe('rooms', (updatedRooms) => {
      setRooms(updatedRooms || []);
    });

    return unsubscribe;
  }, []);

  // Create a new room
  const createRoom = useCallback((roomData) => {
    const newRoom = {
      _id: `room_${Date.now()}`,
      ...roomData,
      createdAt: new Date().toISOString(),
      participants: roomData.participants || [],
      messages: [],
      status: 'active',
    };

    const updated = storageCache.addRoom(newRoom);
    setRooms(updated);
    return newRoom;
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

  return {
    rooms,
    createRoom,
    updateRoom,
    deleteRoom,
    optimisticCreateRoom,
    confirmRoom,
  };
}

export default useGlobalRooms;
