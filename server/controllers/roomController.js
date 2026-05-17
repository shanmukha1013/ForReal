import Room from '../models/Room.js';
import User from '../models/User.js';
import { emitRoomsNew } from '../socket.js';

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
    const userId = req.user.id;

    const room = await Room.findOne({ _id: id, isActive: true });

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (room.participants.includes(userId)) {
      return res.json({ message: 'Already joined', room });
    }

    if (room.participants.length >= room.maxParticipants) {
      return res.status(400).json({ message: 'Room is full' });
    }

    room.participants.push(userId);
    room.participantCount = room.participants.length;
    await room.save();

    const outJoined = room.toObject({ getters: true });
    outJoined.topic = outJoined.title;
    res.json({ message: 'Joined room successfully', room: outJoined });
  } catch (err) {
    console.error('[roomController.joinRoom] error:', err);
    next(err);
  }
};

export default {
  getRooms,
  getRoom,
  createRoom,
  joinRoom,
};
