// -----------------------------------------------------------------------------
// realtime/socket.js – Enterprise Realtime Communication Layer
// -----------------------------------------------------------------------------
// ForReal — We Don’t Talk Shit.
// Manages Socket.IO client with singleton instance, authentication,
// automatic reconnection, room management, and event abstraction.
// Integrates seamlessly with React via useSocket hook.
// -----------------------------------------------------------------------------

import { io } from 'socket.io-client';
import { useEffect, useState, useCallback } from 'react';
import { storageCache } from '../lib/storageCache';

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://forreal-uotb.onrender.com';
const SOCKET_OPTIONS = {
  withCredentials: true,
  transports: ['websocket', 'polling'], // fallback for restrictive networks
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 30000,
  randomizationFactor: 0.5,
  timeout: 20000,
};

// -----------------------------------------------------------------------------
// Singleton instance & state
// -----------------------------------------------------------------------------
let socket = null;
const reconnectTimer = null;
let _initialized = false;
let _lastRefreshAttempt = 0;
const _activeRooms = new Set();

// -----------------------------------------------------------------------------
// Internal helpers
// -----------------------------------------------------------------------------
function persistToken(token) {
  storageCache.setAccessToken(token);
}

function getStoredToken() {
  return storageCache.getAccessToken();
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

/**
 * Initialise / return the singleton socket instance.
 * Connects automatically if not already connected.
 * @returns {import('socket.io-client').Socket}
 */
export function getSocket() {
  if (socket?.connected) {return socket;}

  if (!socket) {
    const token = getStoredToken();
    socket = io(SOCKET_URL, {
      ...SOCKET_OPTIONS,
      auth: { token: token || null },
    });

    // Avoid attaching duplicate global listeners
    if (!_initialized) {
      _initialized = true;
      if (import.meta.env.DEV) {
        socket.on('connect', () => console.log('[Socket] connected', socket.id));
        socket.on('disconnect', (reason) => console.warn('[Socket] disconnected:', reason));
        socket.on('reconnect_attempt', (attempt) => console.log(`[Socket] reconnect attempt #${attempt}`));
      }

      // Centralized connect_error handler (handles expired tokens by attempting refresh)
      socket.on('connect_error', (err) => {
        try {
          console.error('[Socket] connect_error:', err?.message);
          const msg = String(err?.message || '').toLowerCase();
          if (msg.includes('unauthorized:token_expired') || msg.includes('unauthorized:refresh_invalid') || msg.includes('unauthorized:refresh_revoked') || msg.includes('unauthorized:refresh_failed')) {
            // Avoid hammering refresh endpoint during rapid reconnect attempts
            const now = Date.now();
            if (now - _lastRefreshAttempt < 5000) {return;}
            _lastRefreshAttempt = now;
            // Try to refresh access token via API endpoint using HttpOnly cookie
            (async () => {
              try {
                const refreshUrl = `${SOCKET_URL.replace(/\/$/, '')}/api/auth/refresh`;
                const resp = await fetch(refreshUrl, { method: 'POST', credentials: 'include' });
                if (resp.ok) {
                  const json = await resp.json();
                  const newToken = json?.token;
                  if (newToken) {
                    storageCache.setAccessToken(newToken);
                    // re-authenticate socket gracefully
                    authenticateSocket(newToken);
                    return;
                  }
                }
              } catch (e) {
                console.warn('[Socket] refresh attempt failed', e);
              }
              // If refresh failed, signal auth expiry to app
              window.dispatchEvent(new CustomEvent('forreal:auth:expired'));
            })();
          }
        } catch (e) {
          console.error('[Socket] connect_error handler failed', e);
        }
      });

      socket.on('connect', () => {
        // Auto-resubscribe to notifications if user is logged in
        // This is critical because socket.io drops all room memberships upon network reconnect
        const user = storageCache.getUser();
        if (user) {
          const userId = user._id || user.id;
          socket.emit('notifications:subscribe', { scope: { type: 'global' } });
          socket.emit('notifications:subscribe', { scope: { type: 'user', userId } });
        }
        // Auto-rejoin active debate rooms on reconnect
        _activeRooms.forEach(roomId => {
          socket.emit('room:join', { roomId });
        });
      });

      // Server may refresh token during handshake and emit 'auth:refreshed'
      socket.on('auth:refreshed', (payload) => {
        try {
          const token = payload?.token;
          if (token) {
            storageCache.setAccessToken(token);
            authenticateSocket(token);
          }
        } catch (e) {
          console.warn('[Socket] failed to apply server refreshed token', e);
        }
      });

      socket.on('disconnect', () => {});
      socket.on('error', (err) => console.error('[Socket] error:', err));
    }
  }

  if (!socket.connected) {socket.connect();}
  return socket;
}

/**
 * Authenticate the socket connection with a JWT token.
 * Updates token for future reconnects.
 * @param {string} token
 */
export function authenticateSocket(token) {
  persistToken(token);
  const sock = getSocket();

  if (sock && sock.connected) {
    sock.emit('auth:update', { token }, (ack) => {
      if (ack && ack.ok) {
        // successful re-auth
      } else {
        console.warn('[Socket] auth:update failed', ack);
      }
    });
  } else if (sock) {
    // reconnect with new auth token in handshake
    sock.auth = { token };
    sock.connect();
  }
}

/**
 * Disconnect socket and optionally clear stored token.
 * @param {boolean} clearToken
 */
export function disconnectSocket(clearToken = false) {
  if (socket) {
    socket.disconnect();
    // remove listeners and reset initialization flag so a fresh instance
    // will reattach global listeners on next getSocket() call
    try {
      socket.removeAllListeners();
    } catch (e) {
      // ignore
    }
    socket = null;
    _initialized = false;
    _activeRooms.clear();
  }
  if (clearToken) {
    persistToken(null);
  }
}

/**
 * Join a specific namespace room (debate room, presence channel, etc.)
 * @param {string} roomId
 */
export function joinRoom(roomId) {
  _activeRooms.add(roomId);
  getSocket().emit('room:join', { roomId });
}

/**
 * Leave a previously joined room.
 * @param {string} roomId
 */
export function leaveRoom(roomId) {
  _activeRooms.delete(roomId);
  getSocket().emit('room:leave', { roomId });
}

/**
 * Emit a typing indicator event.
 * @param {string} roomId
 * @param {boolean} isTyping
 */
export function emitTyping(roomId, isTyping) {
  getSocket().emit(isTyping ? 'typing:start' : 'typing:stop', { roomId });
}

/**
 * Send a chat message to a room.
 * @param {string} roomId
 * @param {string} text
 * @param {object} metadata (optional)
 */
export function sendChatMessage(roomId, text, metadata = {}) {
  getSocket().emit('message:send', {
    roomId,
    text,
    ...metadata,
  });
}

/**
 * Cast a vote in a debate room.
 * @param {string} roomId
 * @param {'pro'|'against'|'neutral'} side
 */
export function castVote(roomId, side) {
  getSocket().emit('reaction:send', { roomId, reaction: side });
}

/**
 * Subscribe to realtime notifications for the authenticated user.
 * Typically called after successful auth.
 */
export function subscribeToNotifications() {
  getSocket().emit('notifications:subscribe');
}

/**
 * Unsubscribe from notifications.
 */
export function unsubscribeFromNotifications() {
  getSocket().emit('notifications:unsubscribe');
}

// -----------------------------------------------------------------------------
// React Hook: useSocket
// -----------------------------------------------------------------------------
// Use this in functional components to access socket instance and connection state.
// -----------------------------------------------------------------------------
export function useSocket() {
  const [connected, setConnected] = useState(() => isSocketConnected());

  useEffect(() => {
    const sock = getSocket();

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    sock.on('connect', onConnect);
    sock.on('disconnect', onDisconnect);

    // Set initial state correctly
    setConnected(sock.connected);

    return () => {
      sock.off('connect', onConnect);
      sock.off('disconnect', onDisconnect);
    };
  }, []);

  const getSocketInstance = useCallback(() => getSocket(), []);

  return {
    socket: getSocketInstance(),
    connected,
    joinRoom,
    leaveRoom,
    emitTyping,
    sendChatMessage,
    castVote,
    subscribeToNotifications,
    unsubscribeFromNotifications,
    disconnect: disconnectSocket,
  };
}

/**
 * Check if the socket is currently connected (synchronous).
 * @returns {boolean}
 */
export function isSocketConnected() {
  return socket?.connected || false;
}

/**
 * Get the socket ID (useful for debugging).
 * @returns {string|null}
 */
export function getSocketId() {
  return socket?.id || null;
}
