import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import authRoutes from './routes/authRoutes.js';
import postRoutes from './routes/postRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import chatRoutes from './routes/chatRoutes.js';

import http from 'http';
import jwt from 'jsonwebtoken';
import { Server as SocketIOServer } from 'socket.io';
import { setIO } from './socket.js';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Load environment variables
dotenv.config();

const app = express();
// Respect proxies (when behind a load balancer / platform proxy)
app.set('trust proxy', true);
const PORT = process.env.PORT || 5000;

// ============================================================================
// Middleware
// ============================================================================

// CORS configuration
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
if (process.env.NODE_ENV === 'production' && (!process.env.CLIENT_URL || CLIENT_URL.includes('localhost'))) {
  console.warn('[Config] CLIENT_URL is not set to a production URL. Please set CLIENT_URL in environment for production.');
}
app.use(cors({
  origin: CLIENT_URL,
  credentials: true,
}));

// Security headers
try {
  app.use(helmet());
} catch (e) {
  console.warn('[Security] helmet not available', e?.message || e);
}

// Basic rate limiting to prevent abuse (adjust in production as needed)
try {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.RATE_LIMIT_MAX ? parseInt(process.env.RATE_LIMIT_MAX, 10) : 200,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);
} catch (e) {
  console.warn('[Security] rateLimit not available', e?.message || e);
}

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// Cookie parser (for refresh tokens)
app.use(cookieParser());

// Request logging in development
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// ============================================================================
// Routes
// ============================================================================

app.get('/', (req, res) => {
  res.json({ message: 'ForReal API is running', version: '1.0.0' });
});

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/talks', postRoutes); // Alias for backward compatibility
app.use('/api/rooms', roomRoutes);
app.use('/chat', chatRoutes);

// API health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================================
// Socket.IO + Realtime Infrastructure
// ============================================================================

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-prod';

function safeJson(obj) {
  try {
    return obj ? JSON.parse(JSON.stringify(obj)) : obj;
  } catch {
    return obj;
  }
}

function verifySocketToken(token) {
  if (!token) return { ok: false, reason: 'missing_token' };
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { ok: true, payload: decoded };
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return { ok: false, reason: 'token_expired' };
    }
    if (err.name === 'JsonWebTokenError') {
      return { ok: false, reason: 'token_invalid' };
    }
    return { ok: false, reason: 'token_error' };
  }
}

// In-memory fallback structures until we wire full DB-backed messages/events.
// (This keeps realtime stable while still persisting room membership in MongoDB via existing routes.)
const roomState = new Map(); // roomId -> { participants: Set<userId> }

function getRoomState(roomId) {
  if (!roomState.has(roomId)) {
    roomState.set(roomId, { participants: new Set() });
  }
  return roomState.get(roomId);
}

const httpServer = http.createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: CLIENT_URL,
    credentials: true,
  },
  // Allow both websocket and polling transports for broader network compatibility
  transports: ['websocket', 'polling'],
  allowEIO3: false,
});

// expose io to other modules
setIO(io);

// Auth-aware socket handling
io.use(async (socket, next) => {
  // Support token in: auth.token, query.token, or Authorization header style
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.query?.token ||
    socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
    null;
  // Basic logging for auth attempts (avoid logging tokens themselves)
  const meta = {
    ip: socket.handshake.address,
    time: new Date().toISOString(),
  };

  const result = verifySocketToken(token);

  // If token is valid attach and continue
  if (result && result.ok) {
    socket.data.user = { id: result.payload.id, role: result.payload.role };
    console.info('[socket-auth] accepted', { ...meta, userId: result.payload.id });
    return next();
  }

  // If token is not valid (expired/invalid/missing), attempt server-side refresh using refreshToken from cookies
  if (!result || result.ok === false) {
    try {
      // Parse cookies from handshake headers (simple parser)
      const cookieHeader = socket.handshake.headers?.cookie || '';
      const cookies = {};
      cookieHeader.split(';').forEach((c) => {
        const [k, ...v] = c.split('=');
        if (!k) return;
        cookies[k.trim()] = decodeURIComponent((v || []).join('=').trim());
      });

      const refreshToken = socket.handshake.auth?.refreshToken || cookies.refreshToken || null;
      if (!refreshToken) {
        console.warn('[socket-auth] token invalid/expired with no refresh available', meta);
        return next(new Error(`UNAUTHORIZED:${(result && result.reason) || 'unauthorized'}`));
      }

      // Verify refresh token
      let refreshPayload;
      try {
        refreshPayload = jwt.verify(refreshToken, JWT_SECRET);
      } catch (err) {
        console.warn('[socket-auth] refresh token invalid/expired', { ...meta, err: err.message });
        return next(new Error('UNAUTHORIZED:refresh_invalid'));
      }

      // Ensure user still exists and the refresh token was issued
      const User = (await import('./models/User.js')).default;
      const user = await User.findById(refreshPayload.id).exec();
      if (!user) return next(new Error('UNAUTHORIZED:user_not_found'));
      if (!user.refreshTokens || !user.refreshTokens.includes(refreshToken)) {
        console.warn('[socket-auth] refresh token revoked', { userId: user._id });
        return next(new Error('UNAUTHORIZED:refresh_revoked'));
      }

      // Issue a new short-lived access token for the socket and attach it
      const newAccessToken = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '15m' });
      socket.data.user = { id: String(user._id), role: user.role };
      socket.data.refreshedToken = newAccessToken;
      console.info('[socket-auth] refreshed access token for socket', { ...meta, userId: user._id });
      return next();
    } catch (err) {
      console.error('[socket-auth] refresh attempt failed', err);
      return next(new Error('UNAUTHORIZED:refresh_failed'));
    }
  }

  // All other failures are rejected
  const reason = (result && result.reason) || 'unauthorized';
  console.warn('[socket-auth] denied', { ...meta, reason });
  return next(new Error(`UNAUTHORIZED:${reason}`));
});

function joinRoomInMemory(roomId, userId) {
  const state = getRoomState(roomId);
  state.participants.add(String(userId));
}

function leaveRoomInMemory(roomId, userId) {
  const state = getRoomState(roomId);
  state.participants.delete(String(userId));
  if (state.participants.size === 0) {
    roomState.delete(roomId);
  }
}

// Mongo-backed realtime DM/notifications
import { createOrSendMessage as createOrSendMessage } from './controllers/chatController.js';


io.on('connection', (socket) => {
  const user = socket.data.user;
  console.info('[socket] connection established', { userId: user?.id, socketId: socket.id, time: new Date().toISOString() });

  // If middleware refreshed the access token, inform the client so it can update local state
  if (socket.data && socket.data.refreshedToken) {
    try {
      socket.emit('auth:refreshed', { token: socket.data.refreshedToken });
    } catch (e) {
      // ignore
    }
  }

  // Ensure stable reconnect: clean up rooms on reconnect/disconnect
  socket.on('dm:joinConversation', async ({ conversationId } = {}, ack) => {
    try {
      if (!conversationId) throw new Error('conversationId required');
      socket.join(`dm:conv:${conversationId}`);
      // optional ack for client sync
      ack && ack({ ok: true, conversationId });
    } catch (err) {
      ack && ack({ ok: false, error: err.message || 'join failed' });
    }
  });

  socket.on('dm:leaveConversation', ({ conversationId } = {}, ack) => {
    try {
      if (!conversationId) throw new Error('conversationId required');
      socket.leave(`dm:conv:${conversationId}`);
      ack && ack({ ok: true, conversationId });
    } catch (err) {
      ack && ack({ ok: false, error: err.message || 'leave failed' });
    }
  });

  socket.on('room:join', async ({ roomId } = {}, ack) => {
    try {
      if (!roomId) throw new Error('roomId required');

      socket.join(`room:${roomId}`);
      console.info('[socket] user joined room (socket)', { userId: user.id, roomId });
      joinRoomInMemory(roomId, user.id);

      // Broadcast minimal membership update
      const participants = Array.from(getRoomState(roomId).participants);
      io.to(`room:${roomId}`).emit('room:members:update', {
        roomId,
        participants,
      });

      ack && ack({ ok: true });
    } catch (err) {
      ack && ack({ ok: false, error: err.message || 'Join failed' });
    }
  });

  // Allow client to update auth token post-connect (re-auth without reconnect)
  socket.on('auth:update', ({ token } = {}, ack) => {
    try {
      const result = verifySocketToken(token);
      if (!result || result.ok === false) {
        const reason = result?.reason || 'unauthorized';
        console.warn('[socket-auth] auth:update denied', { socketId: socket.id, reason });
        ack && ack({ ok: false, reason });
        return;
      }
      socket.data.user = { id: result.payload.id, role: result.payload.role };
      console.info('[socket-auth] auth:update accepted', { socketId: socket.id, userId: result.payload.id });
      ack && ack({ ok: true });
    } catch (err) {
      console.error('[socket-auth] auth:update error', err);
      ack && ack({ ok: false, error: err.message || 'auth update failed' });
    }
  });

  socket.on('room:leave', ({ roomId } = {}, ack) => {
    try {
      if (!roomId) throw new Error('roomId required');

      socket.leave(`room:${roomId}`);
      leaveRoomInMemory(roomId, user.id);

      const state = roomState.get(roomId);
      const participants = state ? Array.from(state.participants) : [];
      io.to(`room:${roomId}`).emit('room:members:update', {
        roomId,
        participants,
      });

      ack && ack({ ok: true });
    } catch (err) {
      ack && ack({ ok: false, error: err.message || 'Leave failed' });
    }
  });

  // Debate timeline / messaging (existing)
  socket.on('message:send', async ({ roomId, text } = {}, ack) => {
    try {
      if (!roomId) throw new Error('roomId required');
      if (!text || !String(text).trim()) throw new Error('text required');

      const payload = {
        id: `msg_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        roomId,
        text: String(text).trim(),
        author: {
          id: user.id,
        },
        createdAt: new Date().toISOString(),
      };

      // Broadcast to room
      io.to(`room:${roomId}`).emit('message:new', safeJson(payload));

      // TODO: replace in-memory message with MongoDB persistence.
      ack && ack({ ok: true, message: payload });
    } catch (err) {
      ack && ack({ ok: false, error: err.message || 'Send failed' });
    }
  });

  // Direct messaging
  socket.on('dm:typing', ({ conversationId } = {}, ack) => {
    try {
      if (!conversationId) throw new Error('conversationId required');
      // broadcast to everyone else in that conversation room
      socket.to(`dm:conv:${conversationId}`).emit('dm:typing', { conversationId, userId: user.id });
      ack && ack({ ok: true });
    } catch (err) {
      ack && ack({ ok: false, error: err.message || 'typing failed' });
    }
  });

  // Client sends via REST in Messages.jsx. We DO NOT persist here to avoid double-writes.
  /*
   * dm:send is intentionally not implemented.
   * Messages.jsx persists via REST POST /chat to avoid double-writes.
   */
  socket.on('dm:send', async (_data = {}, ack) => { 
    try {
      ack && ack({ ok: false, error: 'Use POST /chat for persistence.' });
    } catch {
      ack && ack({ ok: false, error: 'dm send rejected' });
    }
  });

  // Reactions (existing)
  // Unified reaction handler: supports both DM reactions (conversationId) and room reactions
  socket.on('reaction:send', async (data = {}, ack) => {
    try {
      const { roomId, messageId, reaction, conversationId } = data || {};

      if (conversationId) {
        // DM reaction flow: persist via controller and broadcast to conversation
        if (!messageId || !reaction) throw new Error('invalid reaction payload');
        const payload = {
          id: `rx_${Date.now()}_${Math.random().toString(16).slice(2)}`,
          conversationId,
          messageId,
          reaction,
          actorId: user.id,
          createdAt: new Date().toISOString(),
        };

        const fakeReq = { user: { id: user.id }, body: payload };
        const fakeRes = { status: () => fakeRes, json: (body) => body };
        const body = await createOrSendMessage(fakeReq, fakeRes, () => {});
        const message = body?.message;
        if (!message) throw new Error('message not created');

        io.to(`dm:conv:${message.conversationId}`).emit('dm:new', message);
        ack && ack({ ok: true, message });
        return;
      }

      // Room reaction flow
      if (!roomId || !messageId || !reaction) {
        ack && ack({ ok: false, error: 'invalid reaction payload' });
        return;
      }

      const payload = {
        id: `rx_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        roomId,
        messageId,
        reaction,
        actorId: user.id,
        createdAt: new Date().toISOString(),
      };

      io.to(`room:${roomId}`).emit('reaction:new', safeJson(payload));
      // TODO: persist reaction + implement toggle semantics
      ack && ack({ ok: true });
    } catch (err) {
      ack && ack({ ok: false, error: err.message || 'Reaction failed' });
    }
  });

  // Notifications: client subscribes to room-scoped + global-scoped events
  socket.on('notifications:subscribe', ({ scope } = {}, ack) => {
    try {
      // Minimal scalable approach: use rooms as notification channels
      // scope can be { type: 'user', userId } or { type: 'global' }
      if (!scope) throw new Error('scope required');

      if (scope.type === 'user' && scope.userId) {
        socket.join(`notify:user:${scope.userId}`);
      }
      if (scope.type === 'global') {
        socket.join('notify:global');
      }

      ack && ack({ ok: true });
    } catch (err) {
      ack && ack({ ok: false, error: err.message || 'Subscribe failed' });
    }
  });

  socket.on('disconnect', (reason) => {
    // Clean in-memory participant state for any rooms the socket is in.
    // socket.rooms is a Set including socket.id itself.
    for (const joined of socket.rooms) {
      if (joined.startsWith('room:')) {
        const roomId = joined.slice('room:'.length);
        try {
          leaveRoomInMemory(roomId, user.id);
          const state = roomState.get(roomId);
          const participants = state ? Array.from(state.participants) : [];
          io.to(joined).emit('room:members:update', { roomId, participants });
        } catch {
          // no-op
        }
      }
    }

    console.info('[Socket] disconnected', { userId: user.id, reason });
  });
});

httpServer.on('error', (err) => {
  console.error('[HTTP Server Error]', err);
});

// Centralized Express error handler (production-safe)
app.use((err, req, res, next) => {
  try {
    const status = err?.status || 500;
    const safeMessage = process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || String(err));
    console.error('[Express Error]', { path: req.path, error: err });
    res.status(status).json({ message: safeMessage });
  } catch (e) {
    console.error('[Express Error Handler Failure]', e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Global process-level handlers
process.on('unhandledRejection', (reason, p) => {
  console.error('[Process] unhandledRejection', reason, p);
});

process.on('uncaughtException', (err) => {
  console.error('[Process] uncaughtException', err);
  // In production we may want to exit to allow supervisor to restart
  if (process.env.NODE_ENV === 'production') {
    try {
      httpServer.close(() => {
        console.error('[Process] Shutting down after uncaughtException');
        process.exit(1);
      });
    } catch (e) {
      process.exit(1);
    }
  }
});

// Graceful shutdown on signals
async function gracefulShutdown(signal) {
  console.info('[Server] Received signal', signal, 'shutting down gracefully');
  try {
    httpServer.close(() => console.info('[Server] HTTP server closed'));
    // allow DB shutdown handlers in connectDB to run
    setTimeout(() => process.exit(0), 2000);
  } catch (err) {
    console.error('[Server] Error during graceful shutdown', err);
    process.exit(1);
  }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// ============================================================================
// Server Initialization
// ============================================================================

// Start server only after MongoDB connection succeeds. This mirrors the
// requested pattern while preserving the existing Socket.IO `httpServer`.
if (!process.env.MONGO_URI) {
  console.error('[Server] MONGO_URI is not set. Set MONGO_URI environment variable and restart.');
  process.exit(1);
}

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.info('MongoDB Connected');
    httpServer.listen(process.env.PORT || 10000, () => {
      console.info('Server running');
      console.info(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB Error:', err);
    process.exit(1);
  });

export default app;

