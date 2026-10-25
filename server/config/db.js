const mongoose = require('mongoose');
const logger = require('../utils/logger');

const RETRY_DELAYS_MS = [2000, 5000, 10000, 20000];

const connectDB = async (uri = process.env.MONGODB_URI) => {
  // Retry transient failures (cold networks, Atlas elections) before giving up.
  for (let attempt = 0; ; attempt += 1) {
    try {
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
        maxPoolSize: 20,
      });
      logger.info(`MongoDB connected: ${conn.connection.host}`);
      break;
    } catch (err) {
      const isAuthError = /auth/i.test(err.message);
      if (isAuthError || attempt >= RETRY_DELAYS_MS.length) {
        logger.error(`MongoDB connection failed: ${err.message}`);
        throw err;
      }
      logger.warn(`MongoDB connection attempt ${attempt + 1} failed (${err.message}); retrying...`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
    }
  }

  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
  mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'));
};

const disconnectDB = async () => {
  await mongoose.connection.close();
  logger.info('MongoDB connection closed');
};

module.exports = { connectDB, disconnectDB };
