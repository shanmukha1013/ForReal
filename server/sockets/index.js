const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const config = require('../config/config');
const { corsOriginCallback } = require('../utils/origins');
const Conversation = require('../models/Conversation');

let io;

const isId = (value) => typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value);
const userRoom = (userId) => `user_${userId}`;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: corsOriginCallback,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    maxHttpBufferSize: 1e5, // 100 KB: sockets only carry small control events
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication error: Token missing'));

    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      socket.userId = decoded.userId;
      return next();
    } catch {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    // Each socket joins only its own private room, derived from the verified
    // token. Clients can no longer subscribe to another user's events.
    socket.join(userRoom(socket.userId));

    socket.on('join_debate', (debateId) => {
      if (isId(debateId)) socket.join(`debate_${debateId}`);
    });

    socket.on('leave_debate', (debateId) => {
      if (isId(debateId)) socket.leave(`debate_${debateId}`);
    });

    socket.on('debate_typing', ({ debateId, username } = {}) => {
      if (isId(debateId) && socket.rooms.has(`debate_${debateId}`)) {
        socket.to(`debate_${debateId}`).emit('debate_typing', { username: String(username || '').slice(0, 30) });
      }
    });

    socket.on('debate_stop_typing', ({ debateId, username } = {}) => {
      if (isId(debateId) && socket.rooms.has(`debate_${debateId}`)) {
        socket.to(`debate_${debateId}`).emit('debate_stop_typing', { username: String(username || '').slice(0, 30) });
      }
    });

    socket.on('join_conversation', async (conversationId) => {
      if (!isId(conversationId)) return;
      try {
        const isMember = await Conversation.exists({ _id: conversationId, participants: socket.userId });
        if (isMember) socket.join(`conv_${conversationId}`);
      } catch (error) {
        logger.warn(`join_conversation failed: ${error.message}`);
      }
    });

    socket.on('leave_conversation', (conversationId) => {
      if (isId(conversationId)) socket.leave(`conv_${conversationId}`);
    });

    socket.on('typing', ({ conversationId } = {}) => {
      if (isId(conversationId) && socket.rooms.has(`conv_${conversationId}`)) {
        socket.to(`conv_${conversationId}`).emit('typing', { conversationId, userId: socket.userId });
      }
    });

    socket.on('stop_typing', ({ conversationId } = {}) => {
      if (isId(conversationId) && socket.rooms.has(`conv_${conversationId}`)) {
        socket.to(`conv_${conversationId}`).emit('stop_typing', { conversationId, userId: socket.userId });
      }
    });
  });

  return io;
};

// Emitters are no-ops before initialisation (e.g. in API tests) so that
// controllers never fail because real-time delivery is unavailable.
const emitToUser = (userId, event, payload) => {
  if (io && userId) io.to(userRoom(userId)).emit(event, payload);
};

const emitToRoom = (room, event, payload) => {
  if (io) io.to(room).emit(event, payload);
};

module.exports = {
  initSocket,
  emitToUser,
  emitToRoom,
};
