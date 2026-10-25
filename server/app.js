const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

const config = require('./config/config');
const logger = require('./utils/logger');
const { corsOriginCallback } = require('./utils/origins');
const { sanitizeRequest } = require('./middleware/sanitizeMiddleware');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');
const { uploadDir } = require('./middleware/uploadMiddleware');
const authRoutes = require('./routes/authRoutes');
const talkRoutes = require('./routes/talkRoutes');
const debateRoutes = require('./routes/debateRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const messageRoutes = require('./routes/messageRoutes');
const userRoutes = require('./routes/userRoutes');
const searchRoutes = require('./routes/searchRoutes');

const createApp = () => {
  const app = express();

  // Render, Vercel and most PaaS platforms sit behind one reverse proxy. This
  // makes req.ip (and therefore rate limiting) use the real client address.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // The API serves JSON and uploaded images to a client on another origin, so
  // resources must be loadable cross-origin.
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(compression());
  app.use(cors({ origin: corsOriginCallback, credentials: true }));

  app.use('/api', rateLimit({
    windowMs: config.rateLimit.windowMs,
    limit: config.rateLimit.max,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please slow down and try again shortly.' },
  }));

  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));
  app.use(cookieParser());
  app.use(sanitizeRequest);

  if (config.app.env === 'development') {
    app.use(morgan('dev', { stream: { write: (message) => logger.info(message.trim()) } }));
  }

  // Upload filenames are unique and immutable, so they can be cached hard.
  app.use('/uploads', express.static(uploadDir, {
    maxAge: '30d',
    immutable: true,
    fallthrough: false,
    setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
  }));

  // Liveness/readiness probe for the hosting platform and the client's
  // "waking up the server" state on free tiers.
  app.get(['/api/health', '/health'], (req, res) => {
    const dbReady = mongoose.connection.readyState === 1;
    res.status(dbReady ? 200 : 503).json({
      success: dbReady,
      status: dbReady ? 'ok' : 'degraded',
      database: dbReady ? 'connected' : 'disconnected',
      uptime: Math.round(process.uptime()),
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/talks', talkRoutes);
  app.use('/api/debates', debateRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/messages', messageRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/search', searchRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
};

module.exports = { createApp, uploadsPath: path.resolve(uploadDir) };
