const { Server } = require('socket.io');
const logger = require('../utils/logger');
const config = require('../config/config');

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: config.app.clientUrl,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    // Basic socket foundation events
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
