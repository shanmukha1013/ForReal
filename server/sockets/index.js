const { Server } = require('socket.io');
const logger = require('../utils/logger');
const config = require('../config/config');

let io;

const initSocket = (server) => {
  const clientUrlStr = config.app.clientUrl || '';
  const cleanUrl = clientUrlStr.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const allowedOrigins = [
    `https://${cleanUrl}`,
    `http://${cleanUrl}`,
    'http://localhost:5173'
  ];

  io = new Server(server, {
    cors: {
      origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        if (origin.endsWith('.vercel.app')) return callback(null, true);
        callback(new Error('Not allowed by CORS'));
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  const jwt = require('jsonwebtoken');

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    try {
      const secret = process.env.JWT_SECRET || 'supersecretjwtkey_replace_me_in_production';
      const decoded = jwt.verify(token, secret);
      socket.user = decoded; // Store userId in socket.user.userId
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    // User authentication/joining their personal room
    socket.on('join', (userId) => {
      socket.join(userId);
      logger.info(`User ${userId} joined personal room`);
    });

    // Debate specific rooms
    socket.on('join_debate', (debateId) => {
      socket.join(`debate_${debateId}`);
    });

    socket.on('leave_debate', (debateId) => {
      socket.leave(`debate_${debateId}`);
    });

    socket.on('debate_typing', ({ debateId, username }) => {
      socket.to(`debate_${debateId}`).emit('debate_typing', { username });
    });

    socket.on('debate_stop_typing', ({ debateId, username }) => {
      socket.to(`debate_${debateId}`).emit('debate_stop_typing', { username });
    });

    // Typing indicators
    socket.on('typing', ({ conversationId, userId }) => {
      socket.to(`conv_${conversationId}`).emit('typing', { conversationId, userId });
    });
    
    socket.on('stop_typing', ({ conversationId, userId }) => {
      socket.to(`conv_${conversationId}`).emit('stop_typing', { conversationId, userId });
    });

    // Join conversation room
    socket.on('join_conversation', (conversationId) => {
      socket.join(`conv_${conversationId}`);
    });

    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conv_${conversationId}`);
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIo = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

module.exports = {
  initSocket,
  getIo,
};
