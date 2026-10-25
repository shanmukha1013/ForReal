const http = require('http');

// 1. Load and validate environment variables before anything else.
require('./config/env')();

const config = require('./config/config');
const logger = require('./utils/logger');
const { connectDB, disconnectDB } = require('./config/db');
const { initSocket } = require('./sockets');
const { createApp } = require('./app');
const { syncAllDebates } = require('./services/debateLifecycle');

const app = createApp();
const server = http.createServer(app);
initSocket(server);

let lifecycleTimer;

const start = async () => {
  await connectDB();

  server.listen(config.app.port, () => {
    logger.info(`Server running in ${config.app.env} mode on port ${config.app.port}`);
  });

  // Close expired debates and flag ones ending soon, even when nobody is
  // browsing, so creators get their "debate closed" notification on time.
  lifecycleTimer = setInterval(() => syncAllDebates({ force: true }), 60 * 1000);
  lifecycleTimer.unref();
  syncAllDebates({ force: true });
};

const shutdown = (signal) => {
  logger.info(`${signal} received: closing server`);
  clearInterval(lifecycleTimer);
  server.close(async () => {
    await disconnectDB();
    process.exit(0);
  });
  // Force exit if connections do not drain in time.
  setTimeout(() => process.exit(1), 10000).unref();
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err?.stack || err}`);
});

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err?.stack || err}`);
  // State may be corrupt after an uncaught exception: exit and let the
  // platform restart the process.
  shutdown('uncaughtException');
});

start().catch((error) => {
  logger.error(`Failed to start server: ${error.message}`);
  process.exit(1);
});
