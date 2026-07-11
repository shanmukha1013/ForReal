const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

// 1. Validate environment variables before anything else
require('./config/env')();

const config = require('./config/config');
const { connectDB } = require('./config/db');
const { initSocket } = require('./sockets');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');
const authRoutes = require('./routes/authRoutes');
const talkRoutes = require('./routes/talkRoutes');
const logger = require('./utils/logger');

// Connect to database
connectDB();

const app = express();
const server = http.createServer(app);

// Initialize Socket.io foundation
initSocket(server);

// Security and Performance Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: config.app.clientUrl,
  credentials: true
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

// Request Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Logging
if (config.app.env === 'development') {
  app.use(morgan('dev', {
    stream: { write: (message) => logger.info(message.trim()) }
  }));
}

// Serve static uploads
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/talks', talkRoutes);

// Error Handling
app.use(notFound);
app.use(errorHandler);

server.listen(config.app.port, () => {
  logger.info(`Server running in ${config.app.env} mode on port ${config.app.port}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});
