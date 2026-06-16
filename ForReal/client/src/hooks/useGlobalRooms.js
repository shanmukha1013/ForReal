// ─────────────────────────────────────────────────────────────────────────────
// useGlobalRooms.js – Hook for reactive global rooms/debates management
// ─────────────────────────────────────────────────────────────────────────────
// Ensures room creation instantly propagates across app. Subscribers
// get notified when rooms are created, updated, or deleted.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { storageCache } from '../lib/storageCache';
import apiClient from '../api/api.js';
import { getSocket } from '../realtime/socket';

export function useGlobalRooms() {
  const [rooms, setRooms] = useState(storageCache.getRooms());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleMembersUpdate = (data) => {
      if (!data || !data.roomId) return;
      storageCache.updateRoom(data.roomId, { participants: data.participants });
    };

    const handleNewMessage = (msg) => {
      if (!msg || !msg.roomId) return;
      const currentRooms = storageCache.getRooms();
      const room = currentRooms.find(r => r._id === msg.roomId);
      if (room) {
        if (room.messages?.some(m => m.id === msg.id || m._id === msg.id)) return;
        const updatedMessages = [...(room.messages || []), msg];
        storageCache.updateRoom(msg.roomId, { messages: updatedMessages });
      }
    };

    const handleNewRoom = (room) => {
      if (!room || !room._id) return;
      storageCache.addRoom(room);
    };

    const handleRoomDeleted = ({ roomId } = {}) => {
      if (!roomId) return;
      storageCache.deleteRoom(roomId);
    };

    const handleReactionNew = (data) => {
      if (!data || !data.roomId) return;
      const currentRooms = storageCache.getRooms();
      const room = currentRooms.find(r => r._id === data.roomId);
      if (room && !data.messageId) {
        const updatedRoom = { ...room };
        updatedRoom.pro = updatedRoom.pro || { position: 'Pro', participants: [] };
        updatedRoom.against = updatedRoom.against || { position: 'Against', participants: [] };
        
        if (data.reaction === 'pro') {
          if (!updatedRoom.pro.participants.includes(data.actorId)) {
            updatedRoom.pro.participants.push(data.actorId);
            updatedRoom.against.participants = updatedRoom.against.participants.filter(id => id !== data.actorId);
          }
        } else if (data.reaction === 'against') {
          if (!updatedRoom.against.participants.includes(data.actorId)) {
            updatedRoom.against.participants.push(data.actorId);
            updatedRoom.pro.participants = updatedRoom.pro.participants.filter(id => id !== data.actorId);
          }
        }
        storageCache.updateRoom(data.roomId, updatedRoom);
      }
    };

    socket.on('room:members:update', handleMembersUpdate);
    socket.on('message:new', handleNewMessage);
    socket.on('rooms:new', handleNewRoom);
    socket.on('rooms:deleted', handleRoomDeleted);
    socket.on('reaction:new', handleReactionNew);

    return () => {
      socket.off('room:members:update', handleMembersUpdate);
      socket.off('message:new', handleNewMessage);
      socket.off('rooms:new', handleNewRoom);
      socket.off('rooms:deleted', handleRoomDeleted);
      socket.off('reaction:new', handleReactionNew);
    };
  }, []);

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
      const response = await apiClient.rooms.getAll(params);
      // Determine if response is an array or object wrapping an array
      const roomList = Array.isArray(response) ? response : (response?.rooms || response?.data || []);
      storageCache.setRooms(roomList);
    } catch (err) {
      console.error('[useGlobalRooms] Failed to fetch rooms:', err);
      setError(err?.message || 'Failed to load rooms');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch single room by ID
  const fetchRoomById = useCallback(async (roomId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.rooms.getById(roomId);
      const roomData = response?.room || response?.data || response;
      if (roomData) {
        const existing = storageCache.getRooms().find(r => r._id === roomId);
        if (existing) {
          storageCache.updateRoom(roomId, roomData);
        } else {
          storageCache.addRoom(roomData);
        }
      }
      return roomData;
    } catch (err) {
      console.error('[useGlobalRooms] Failed to fetch room:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a new room
  const createRoom = useCallback(async (roomData) => {
    setError(null);
    try {
      const response = await apiClient.rooms.create(roomData);
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

  const endRoom = useCallback(async (roomId) => {
    const response = await apiClient.rooms.end(roomId);
    const roomData = response?.room || response;
    if (roomData?._id) {
      const updated = storageCache.updateRoom(roomId, roomData);
      setRooms(updated);
    }
    return roomData;
  }, []);

  const deleteRoomRemote = useCallback(async (roomId) => {
    await apiClient.rooms.delete(roomId);
    return deleteRoom(roomId);
  }, [deleteRoom]);

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
    const alreadyExists = currentRooms.some(r => r._id === realRoom._id && r._id !== optimisticId);
    let updated;
    if (alreadyExists) {
      updated = currentRooms.filter(r => r._id !== optimisticId);
    } else {
      updated = currentRooms.map((r) => r._id === optimisticId ? realRoom : r);
    }
    storageCache.setRooms(updated);
    setRooms(updated);
  }, []);

  // Join an existing room via API
  const joinRoom = useCallback(async (roomId) => {
    try {
      await apiClient.rooms.join(roomId);
    } catch (err) {
      console.warn(`[useGlobalRooms] Failed to join room API:`, err);
      // Socket handles real-time fallbacks, no throw required
    }
  }, []);

  // Leave a room via API
  const leaveRoom = useCallback(async (roomId) => {
    try {
      await apiClient.rooms.leave(roomId);
    } catch (err) {
      console.warn(`[useGlobalRooms] Failed to leave room API:`, err);
    }
  }, []);

  return {
    rooms,
    loading,
    error,
    fetchRooms,
    fetchRoomById,
    createRoom,
    updateRoom,
    deleteRoom,
    endRoom,
    deleteRoomRemote,
    optimisticCreateRoom,
    confirmRoom,
    joinRoom,
    leaveRoom,
  };
}

export default useGlobalRooms;
