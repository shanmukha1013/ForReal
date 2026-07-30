import { io } from 'socket.io-client';

// When running in dev, use '/' so the Vite proxy handles it (/socket.io -> localhost:5000).
// In production (VITE_API_URL set), use the actual server URL.
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 
  (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : '/');

class SocketService {
  constructor() {
    this.socket = null;
    this.token = null;
    this._reconnecting = false;
  }

  connect(token) {
    this.token = token;

    // If already connected with a live socket, just return
    if (this.socket?.connected) {
      // Update auth token in case it changed
      this.socket.auth = { token };
      return this.socket;
    }

    // Disconnect stale socket before creating a new one
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.socket = io(SOCKET_URL, {
      auth: { token },
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected:', this.socket.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('[Socket] Disconnected:', reason);
    });

    this.socket.on('connect_error', (err) => {
      // Only log in dev, don't spam console in prod
      if (import.meta.env.DEV) {
        console.warn('[Socket] Connection error:', err.message);
      }
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.token = null;
    }
  }

  getSocket() {
    return this.socket;
  }

  isConnected() {
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();
