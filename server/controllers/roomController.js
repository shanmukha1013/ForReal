import Room from '../models/Room.js';
import User from '../models/User.js';
import { emitRoomsNew, getIO } from '../socket.js';

// ============================================================================
// Room Controller - Production-ready
// ============================================================================

/**
 * Get all active rooms
 * GET /api/rooms
 */
export const getRooms = async (req, res, next) => {
  try {
    const rooms = await Room.find({ isActive: true })
      .populate('createdBy', '-password -__v')
      .populate('participants', '-password -__v')
      .sort({ createdAt: -1 })
      .limit(50);

    // Alias `title` -> `topic` for frontend compatibility
    const outRooms = rooms.map((r) => {
      const obj = r.toObject({ getters: true });
      obj.topic = obj.title;
      return obj;
    });
    res.json({ rooms: outRooms });
  } catch (err) {
    console.error('[roomController.getRooms] error:', err);
    next(err);
  }
};

/**
 * Get a single room by ID
 * GET /api/rooms/:id
 */
export const getRoom = async (req, res, next) => {
  try {
    const { id } = req.params;

    const room = await Room.findOne({ _id: id, isActive: true })
      .populate('createdBy', '-password -__v')
      .populate('participants', '-password -__v');

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const out = room.toObject({ getters: true });
    out.topic = out.title;
    res.json({ room: out });
  } catch (err) {
    console.error('[roomController.getRoom] error:', err);
    next(err);
  }
};

/**
 * Create a new room
 * POST /api/rooms
 */
export const createRoom = async (req, res, next) => {
  try {
    // Accept both `title` and legacy `topic` from the frontend.
    const { title: rawTitle, topic, description, isPrivate, visibility, category } = req.body;
    const title = (rawTitle || topic || '').trim();
    const privateFlag = typeof isPrivate === 'boolean' ? isPrivate : (visibility === 'private');
    const createdBy = req.user.id;

    if (!title) {
      return res.status(400).json({ message: 'Room title is required' });
    }

    const user = await User.findById(createdBy);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    const room = new Room({
      title: title,
      description: description?.trim() || '',
      createdBy,
      participants: [createdBy],
      participantCount: 1,
      isPrivate: privateFlag || false,
      // allow optional category for richer frontend experience
      category: category || undefined,
    });

    await room.save();
    await room.populate('createdBy', '-password -__v');

    console.info('[roomController.createRoom] created room', { title: room.title, id: room._id, createdBy });

    const outRoom = room.toObject({ getters: true });
    outRoom.topic = outRoom.title;
    // Broadcast newly created room to connected clients
    try {
      emitRoomsNew(outRoom);
      console.info('[roomController.createRoom] emitted rooms:new', { id: outRoom._id });
    } catch (err) {
      console.warn('[roomController.createRoom] failed to emit rooms:new', err.message || err);
    }
    res.status(201).json({ room: outRoom });
  } catch (err) {
    console.error('[roomController.createRoom] error:', err);
    next(err);
  }
};

/**
 * Join a room
 * POST /api/rooms/:id/join
 */
export const joinRoom = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { side } = req.body || {};
    const userId = req.user.id;

    const room = await Room.findOne({ _id: id, isActive: true });

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (side === 'pro') {
      room.pro = room.pro || { position: 'Pro', participants: [] };
      if (!room.pro.participants.includes(userId)) room.pro.participants.push(userId);
      if (room.against) room.against.participants = room.against.participants.filter(pid => String(pid) !== String(userId));
    } else if (side === 'against') {
      room.against = room.against || { position: 'Against', participants: [] };
      if (!room.against.participants.includes(userId)) room.against.participants.push(userId);
      if (room.pro) room.pro.participants = room.pro.participants.filter(pid => String(pid) !== String(userId));
    }

    if (!room.participants.includes(userId)) {
      if (room.participants.length >= room.maxParticipants) {
        return res.status(400).json({ message: 'Room is full' });
      }
      room.participants.push(userId);
    }

    room.participantCount = room.participants.length;
    await room.save();

    const outJoined = room.toObject({ getters: true });
    outJoined.topic = outJoined.title;

    try {
      const io = getIO();
      if (io) {
        io.to(`room:${id}`).emit('debate:presence', {
          proCount: room.pro?.participants?.length || 0,
          againstCount: room.against?.participants?.length || 0,
          observerCount: room.participants?.length || 0
        });
      }
    } catch (e) {
      console.warn('[roomController] Failed to emit presence', e);
    }

    res.json({ message: 'Joined room successfully', room: outJoined });
  } catch (err) {
    console.error('[roomController.joinRoom] error:', err);
    next(err);
  }
};

/**
 * Leave a room
 * POST /api/rooms/:id/leave
 */
export const leaveRoom = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await Room.findByIdAndUpdate(id, { $pull: { participants: userId } });

    res.json({ message: 'Left room successfully' });
  } catch (err) {
    console.error('[roomController.leaveRoom] error:', err);
    next(err);
  }
};

const canModerateRoom = (room, user) => (
  String(room.createdBy) === String(user.id) || user.role === 'admin'
);

/**
 * End a room without deleting its history.
 * PATCH /api/rooms/:id/end
 */
export const endRoom = async (req, res, next) => {
  try {
    const { id } = req.params;
    const room = await Room.findOne({ _id: id, isActive: true });

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    if (!canModerateRoom(room, req.user)) {
      return res.status(403).json({ message: 'Not authorized to end this debate' });
    }

    room.status = 'ended';
    room.endTime = new Date();
    await room.save();

    const out = room.toObject({ getters: true });
    out.topic = out.title;

    try {
      const io = getIO();
      if (io) {
        io.to(`room:${id}`).emit('debate:ended', { roomId: id, room: out });
      }
    } catch (err) {
      console.warn('[roomController.endRoom] failed to emit debate:ended', err.message || err);
    }

    res.json({ message: 'Debate ended', room: out });
  } catch (err) {
    console.error('[roomController.endRoom] error:', err);
    next(err);
  }
};

/**
 * Soft delete a room.
 * DELETE /api/rooms/:id
 */
export const deleteRoom = async (req, res, next) => {
  try {
    const { id } = req.params;
    const room = await Room.findOne({ _id: id, isActive: true });

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    if (!canModerateRoom(room, req.user)) {
      return res.status(403).json({ message: 'Not authorized to delete this debate' });
    }

    room.isActive = false;
    room.status = 'deleted';
    room.endTime = room.endTime || new Date();
    await room.save();

    try {
      const io = getIO();
      if (io) {
        io.to(`room:${id}`).emit('room:deleted', { roomId: id });
        io.emit('rooms:deleted', { roomId: id });
      }
    } catch (err) {
      console.warn('[roomController.deleteRoom] failed to emit delete', err.message || err);
    }

    res.json({ message: 'Debate deleted', roomId: id });
  } catch (err) {
    console.error('[roomController.deleteRoom] error:', err);
    next(err);
  }
};

export default {
  getRooms,
  getRoom,
  createRoom,
  joinRoom,
  leaveRoom,
  endRoom,
  deleteRoom,
};
