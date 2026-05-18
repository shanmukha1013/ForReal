// CommonJS server for Render / Node without changing package.json
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

const authRoutes = require('./routes/authRoutes.js');
const postRoutes = require('./routes/postRoutes.js');
const roomRoutes = require('./routes/roomRoutes.js');
const chatRoutes = require('./routes/chatRoutes.js');
const userRoutes = require('./routes/userRoutes.js');

function unwrapESModuleRouter(m) {
  // ESM interop: require() returns { default: router } when file is ESM.
  return m && (m.router || m.default || m);
}



const http = require('http');
const jwt = require('jsonwebtoken');
const { Server: SocketIOServer } = require('socket.io');
const { setIO } = require('./socket.js');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Load environment variables (required)
dotenv.config();

const app = express();

// Diagnostic headers to identify which backend instance handled a request
// (Used only for smoke-test tracing; does not alter route behavior.)
app.use((req, res, next) => {
  res.set('X-Mock-API', 'false');
  res.set('X-Server-Name', process.env.SERVER_NAME || 'real-backend-cjs');
  res.set('X-Route-Version', process.env.ROUTE_VERSION || 'v1');
  // Ensure headers are readable by browser clients
  res.set('Access-Control-Expose-Headers', 'X-Mock-API,X-Server-Name,X-Route-Version');
  next();
});
// Explicitly trust Render's / platform proxy headers
app.set('trust proxy', 1);

// Use Render-friendly port (required)
const PORT = process.env.PORT || 10000;

// ============================================================================
// Middleware
// ============================================================================

// Production CORS: lock down to the deployed Vercel frontend origin.
// Keep env override for flexibility, but default to the correct production URL.
const PROD_CLIENT_ORIGIN = 'https://for-real-seven.vercel.app';
const CLIENT_URL = process.env.CLIENT_URL || PROD_CLIENT_ORIGIN;

app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  })
);

try {
  app.use(helmet());
} catch (e) {
  console.warn('[Security] helmet not available', e && e.message ? e.message : e);
}

try {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.RATE_LIMIT_MAX ? parseInt(process.env.RATE_LIMIT_MAX, 10) : 200,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);
} catch (e) {
  console.warn('[Security] rateLimit not available', e && e.message ? e.message : e);
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

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

app.use('/api/auth', unwrapESModuleRouter(authRoutes));
app.use('/api/posts', unwrapESModuleRouter(postRoutes));
app.use('/api/talks', unwrapESModuleRouter(postRoutes)); // Alias for backward compatibility
app.use('/api/rooms', unwrapESModuleRouter(roomRoutes));
app.use('/api/users', unwrapESModuleRouter(userRoutes));
app.use('/chat', unwrapESModuleRouter(chatRoutes));
app.use('/api/chat', unwrapESModuleRouter(chatRoutes)); // Standardized API prefix mapping


app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Fallback Explore Route to prevent 404s on the frontend search bar
app.get('/api/explore/search', async (req, res) => {
  try {
    const q = String(req.query.q || '');
    if (!q) return res.json({ users: [], posts: [], rooms: [] });
    
    let users = [], posts = [], rooms = [];
    try {
      const User = (await import('./models/User.js')).default;
      users = await User.find({ $or: [{ username: new RegExp(q, 'i') }, { displayName: new RegExp(q, 'i') }] }).limit(10).select('-password').lean();
    } catch(e) {}
    try {
      const Post = (await import('./models/Post.js')).default;
      posts = await Post.find({ content: new RegExp(q, 'i') }).limit(10).populate('author', 'username displayName avatar').lean();
    } catch(e) {}
    try {
      const Room = (await import('./models/Room.js')).default;
      rooms = await Room.find({ $or: [{ topic: new RegExp(q, 'i') }, { title: new RegExp(q, 'i') }] }).limit(10).lean();
    } catch(e) {}
    
    res.json({ users, posts, rooms });
  } catch (err) {
    res.json({ users: [], posts: [], rooms: [] });
  }
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
    if (err && err.name === 'TokenExpiredError') return { ok: false, reason: 'token_expired' };
    if (err && err.name === 'JsonWebTokenError') return { ok: false, reason: 'token_invalid' };
    return { ok: false, reason: 'token_error' };
  }
}

const roomState = new Map();
function getRoomState(roomId) {
  if (!roomState.has(roomId)) roomState.set(roomId, { participants: new Set() });
  return roomState.get(roomId);
}
function joinRoomInMemory(roomId, userId) {
  const state = getRoomState(roomId);
  state.participants.add(String(userId));
}
function leaveRoomInMemory(roomId, userId) {
  const state = getRoomState(roomId);
  state.participants.delete(String(userId));
  if (state.participants.size === 0) roomState.delete(roomId);
}

const httpServer = http.createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: CLIENT_URL,
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  allowEIO3: false,
});

setIO(io);

io.use(async (socket, next) => {
  const token =
    (socket.handshake && socket.handshake.auth && socket.handshake.auth.token) ||
    (socket.handshake && socket.handshake.query && socket.handshake.query.token) ||
    (socket.handshake && socket.handshake.headers && socket.handshake.headers.authorization
      ? socket.handshake.headers.authorization.replace('Bearer ', '')
      : null);

  const meta = {
    ip: socket.handshake.address,
    time: new Date().toISOString(),
  };

  const result = verifySocketToken(token);

  if (result && result.ok) {
    socket.data.user = { id: result.payload.id, role: result.payload.role };
    console.info('[socket-auth] accepted', { ...meta, userId: result.payload.id });
    return next();
  }

  if (!result || result.ok === false) {
    try {
      const cookieHeader = (socket.handshake && socket.handshake.headers && socket.handshake.headers.cookie) || '';
      const cookies = {};
      cookieHeader.split(';').forEach((c) => {
        const [k, ...v] = c.split('=');
        if (!k) return;
        cookies[k.trim()] = decodeURIComponent((v || []).join('=').trim());
      });

      const refreshToken =
        (socket.handshake && socket.handshake.auth && socket.handshake.auth.refreshToken) || cookies.refreshToken || null;

      if (!refreshToken) {
        console.warn('[socket-auth] token invalid/expired with no refresh available', meta);
        return next(new Error(`UNAUTHORIZED:${(result && result.reason) || 'unauthorized'}`));
      }

      let refreshPayload;
      try {
        refreshPayload = jwt.verify(refreshToken, JWT_SECRET);
      } catch (err) {
        console.warn('[socket-auth] refresh token invalid/expired', { ...meta, err: err && err.message });
        return next(new Error('UNAUTHORIZED:refresh_invalid'));
      }

      // User model is currently ESM in the repo; require() may fail if the model file uses import.
      // To keep startup working, fall back to dynamic import only when refresh flow is used.
      const User = (await import('./models/User.js')).default;
      const user = await User.findById(refreshPayload.id).exec();

      if (!user) return next(new Error('UNAUTHORIZED:user_not_found'));
      if (!user.refreshTokens || !user.refreshTokens.includes(refreshToken)) {
        console.warn('[socket-auth] refresh token revoked', { userId: user._id });
        return next(new Error('UNAUTHORIZED:refresh_revoked'));
      }

      const newAccessToken = jwt.sign(
        { id: user._id, role: user.role },
        JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
      );

      socket.data.user = { id: String(user._id), role: user.role };
      socket.data.refreshedToken = newAccessToken;
      console.info('[socket-auth] refreshed access token for socket', { ...meta, userId: user._id });
      return next();
    } catch (err) {
      console.error('[socket-auth] refresh attempt failed', err);
      return next(new Error('UNAUTHORIZED:refresh_failed'));
    }
  }

  const reason = (result && result.reason) || 'unauthorized';
  console.warn('[socket-auth] denied', { ...meta, reason });
  return next(new Error(`UNAUTHORIZED:${reason}`));
});

const { createOrSendMessage } = require('./controllers/chatController.js');

io.on('connection', (socket) => {
  const user = socket.data.user;
  console.info('[socket] connection established', {
    userId: user && user.id,
    socketId: socket.id,
    time: new Date().toISOString(),
  });

  if (socket.data && socket.data.refreshedToken) {
    try {
      socket.emit('auth:refreshed', { token: socket.data.refreshedToken });
    } catch (e) {
      // ignore
    }
  }

  socket.on('dm:joinConversation', async ({ conversationId } = {}, ack) => {
    try {
      if (!conversationId) throw new Error('conversationId required');
      socket.join(`dm:conv:${conversationId}`);
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

      const participants = Array.from(getRoomState(roomId).participants);
      io.to(`room:${roomId}`).emit('room:members:update', { roomId, participants });
      ack && ack({ ok: true });
    } catch (err) {
      ack && ack({ ok: false, error: err.message || 'Join failed' });
    }
  });

  socket.on('auth:update', ({ token } = {}, ack) => {
    try {
      const result = verifySocketToken(token);
      if (!result || result.ok === false) {
        const reason = result && result.reason ? result.reason : 'unauthorized';
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
      io.to(`room:${roomId}`).emit('room:members:update', { roomId, participants });

      ack && ack({ ok: true });
    } catch (err) {
      ack && ack({ ok: false, error: err.message || 'Leave failed' });
    }
  });

  socket.on('message:send', async ({ roomId, text } = {}, ack) => {
    try {
      if (!roomId) throw new Error('roomId required');
      if (!text || !String(text).trim()) throw new Error('text required');

      let authorData = { id: user.id };
      try {
        const User = (await import('./models/User.js')).default;
        const sender = await User.findById(user.id).select('username displayName avatar').lean();
        if (sender) authorData = { id: String(sender._id), username: sender.username, displayName: sender.displayName, avatar: sender.avatar };
      } catch(e) {}

      const payload = {
        id: `msg_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        roomId,
        text: String(text).trim(),
        author: authorData,
        createdAt: new Date().toISOString(),
      };

      io.to(`room:${roomId}`).emit('message:new', safeJson(payload));
      try {
        const Room = (await import('./models/Room.js')).default;
        await Room.findByIdAndUpdate(roomId, { $push: { messages: payload } });
      } catch (e) {
        console.warn('[Socket] Failed to persist room message', e);
      }

      ack && ack({ ok: true, message: payload });
    } catch (err) {
      ack && ack({ ok: false, error: err.message || 'Send failed' });
    }
  });

  socket.on('dm:typing', ({ conversationId } = {}, ack) => {
    try {
      if (!conversationId) throw new Error('conversationId required');
      socket.to(`dm:conv:${conversationId}`).emit('dm:typing', { conversationId, userId: user.id });
      ack && ack({ ok: true });
    } catch (err) {
      ack && ack({ ok: false, error: err.message || 'typing failed' });
    }
  });

  socket.on('dm:send', async (_data = {}, ack) => {
    try {
      ack && ack({ ok: false, error: 'Use POST /chat for persistence.' });
    } catch {
      ack && ack({ ok: false, error: 'dm send rejected' });
    }
  });

  socket.on('reaction:send', async (data = {}, ack) => {
    try {
      const { roomId, messageId, reaction, conversationId } = data || {};

      if (conversationId) {
        if (!messageId || !reaction) throw new Error('invalid reaction payload');
        const payload = {
          id: `rx_${Date.now()}_${Math.random().toString(16).slice(2)}`,
          conversationId,
          messageId,
          reaction,
          actorId: user.id,
          createdAt: new Date().toISOString(),
        };

        let capturedBody = null;
        const fakeReq = { user: { id: user.id }, body: payload };
        const fakeRes = { 
          status: () => fakeRes, 
          json: (b) => { capturedBody = b; return fakeRes; } 
        };
        await createOrSendMessage(fakeReq, fakeRes, () => {});
        const message = capturedBody && capturedBody.message;
        if (!message) throw new Error('message not created');

        io.to(`dm:conv:${message.conversationId}`).emit('dm:new', message);
        ack && ack({ ok: true, message });
        return;
      }

      if (!roomId || !reaction) {
        ack && ack({ ok: false, error: 'invalid reaction payload' });
        return;
      }

      const payload = {
        id: `rx_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        roomId,
        messageId: messageId || null,
        reaction,
        actorId: user.id,
        createdAt: new Date().toISOString(),
      };

      io.to(`room:${roomId}`).emit('reaction:new', safeJson(payload));
      try {
        const Room = (await import('./models/Room.js')).default;
        const room = await Room.findById(roomId);
        if (room) {
          room.pro = room.pro || { position: 'Pro', participants: [], score: 0 };
          room.against = room.against || { position: 'Against', participants: [], score: 0 };
          
          if (reaction === 'pro') {
            if (!room.pro.participants.includes(user.id)) room.pro.participants.push(user.id);
            room.against.participants = room.against.participants.filter(id => String(id) !== String(user.id));
          } else if (reaction === 'against') {
            if (!room.against.participants.includes(user.id)) room.against.participants.push(user.id);
            room.pro.participants = room.pro.participants.filter(id => String(id) !== String(user.id));
          }
          room.markModified('pro');
          room.markModified('against');
          await room.save();
        }
      } catch (e) {
        console.warn('[Socket] Failed to persist room reaction', e);
      }
      ack && ack({ ok: true });
    } catch (err) {
      ack && ack({ ok: false, error: err.message || 'Reaction failed' });
    }
  });

  socket.on('debate:start', async ({ roomId, durationSec } = {}, ack) => {
    try {
      if (!roomId) throw new Error('roomId required');
      const Room = (await import('./models/Room.js')).default;
      const room = await Room.findById(roomId);
      if (room) {
        room.status = 'active';
        room.debateTimer = { startedAt: new Date().toISOString(), duration: durationSec || 3600 };
        await room.save();
        io.to(`room:${roomId}`).emit('debate:started', { roomId, durationSec });
      }
      ack && ack({ ok: true });
    } catch (err) {
      ack && ack({ ok: false, error: err.message });
    }
  });

  socket.on('debate:score', async ({ roomId, side, delta } = {}, ack) => {
    try {
      if (!roomId || !side) return;
      const Room = (await import('./models/Room.js')).default;
      const room = await Room.findById(roomId);
      if (room) {
        room[side] = room[side] || { position: side, participants: [], score: 0 };
        room[side].score = (room[side].score || 0) + delta;
        room.markModified(side);
        await room.save();
        io.to(`room:${roomId}`).emit('debate:score', { pro: room.pro?.score || 0, against: room.against?.score || 0 });
      }
    } catch (e) {}
  });

  socket.on('typing:start', ({ roomId } = {}) => {
    if (roomId) {
      socket.to(`room:${roomId}`).emit('typing:start', { 
        userId: user.id, 
        username: user.username || user.displayName || 'User' 
      });
    }
  });

  socket.on('typing:stop', ({ roomId } = {}) => {
    if (roomId) {
      socket.to(`room:${roomId}`).emit('typing:stop', { userId: user.id });
    }
  });

  socket.on('notifications:subscribe', ({ scope } = {}, ack) => {
    try {
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

  socket.on('disconnecting', (reason) => {
    for (const joined of socket.rooms) {
      if (joined.startsWith('room:')) {
        const roomId = joined.slice('room:'.length);
        try {
          leaveRoomInMemory(roomId, user?.id);
          const state = roomState.get(roomId);
          const participants = state ? Array.from(state.participants) : [];
          io.to(joined).emit('room:members:update', { roomId, participants });
        } catch {
          // no-op
        }
      }
    }
  });

  socket.on('disconnect', (reason) => {
    console.info('[Socket] disconnected', { userId: user?.id, reason });
  });
});

httpServer.on('error', (err) => {
  console.error('[HTTP Server Error]', err);
});

// ============================================================================
// Express error handler (production-safe)
// ============================================================================

app.use((err, req, res, _next) => {
  try {
    const status = err && err.status ? err.status : 500;
    const safeMessage = process.env.NODE_ENV === 'production' ? 'Internal server error' : err && err.message ? err.message : String(err);

    console.error('[Express Error]', { path: req.path, error: err });
    res.status(status).json({ message: safeMessage });
  } catch (e) {
    console.error('[Express Error Handler Failure]', e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

process.on('unhandledRejection', (reason, p) => {
  console.error('[Process] unhandledRejection', reason, p);
});

process.on('uncaughtException', (err) => {
  console.error('[Process] uncaughtException', err);
  try {
    httpServer.close(() => {
      console.error('[Process] Shutting down after uncaughtException');
      process.exit(1);
    });
  } catch {
    process.exit(1);
  }
});

async function gracefulShutdown(signal) {
  console.info('[Server] Received signal', signal, 'shutting down gracefully');
  try {
    httpServer.close(() => console.info('[Server] HTTP server closed'));
    if (mongoose && mongoose.connection && mongoose.connection.readyState === 1) {
      await mongoose.connection.close(false);
    }
  } catch (err) {
    console.error('[Server] Error during graceful shutdown', err);
  } finally {
    setTimeout(() => process.exit(0), 2000);
  }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// ============================================================================
// Server Initialization (Render-safe)
// ============================================================================

const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  console.error('[Server] MONGO_URI is not set. Set MONGO_URI environment variable and redeploy to Render.');
  process.exit(1);
}

(async () => {
  try {
    mongoose.connection.on('error', (err) => {
      console.error('[MongoDB] connection error:', err);
    });

    await mongoose.connect(mongoUri);

    // Required log
    console.info('MongoDB Connected');

    httpServer.listen(PORT, () => {
      // Required log
      console.info('Server running on port ' + PORT);
    });

    console.info(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
  } catch (err) {
    console.error('[MongoDB] Error during connection:', err);
    process.exit(1);
  }
})();

module.exports = app;
