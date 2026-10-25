import { getAccessToken, refreshAccessToken } from './api';

// In development the Vite proxy forwards /socket.io to the API. In production
// VITE_SOCKET_URL (or the origin of VITE_API_URL) points at the API host.
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL
  || (/^https?:\/\//.test(import.meta.env.VITE_API_URL || '') ? new URL(import.meta.env.VITE_API_URL).origin : '/');

// The socket.io client is loaded on demand, so visitors who never sign in
// (e.g. on the landing page) never download it. Components subscribe to
// instance changes through subscribe()/getVersion() (see useSocket).
class SocketService {
  socket = null;

  version = 0;

  listeners = new Set();

  pending = null;

  authRetries = 0;

  subscribe = (listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getVersion = () => this.version;

  notify() {
    this.version += 1;
    this.listeners.forEach((listener) => listener());
  }

  connect() {
    if (this.socket) {
      if (!this.socket.connected) this.socket.connect();
      return this.pending || Promise.resolve(this.socket);
    }
    if (this.pending) return this.pending;

    const attempt = import('socket.io-client').then(({ io }) => {
      // disconnect() may have been called while the module was loading.
      if (this.pending !== attempt) return null;

      const socket = io(SOCKET_URL, {
        // Read the token lazily so every (re)connection uses the freshest one.
        auth: (cb) => cb({ token: getAccessToken() }),
        withCredentials: true,
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
        timeout: 20000,
      });

      socket.on('connect', () => {
        this.authRetries = 0;
      });

      socket.on('connect_error', async (err) => {
        // Access tokens are short-lived: refresh and retry the handshake, but
        // give up after a couple of attempts instead of looping forever.
        if (err.message?.startsWith('Authentication error') && this.authRetries < 2) {
          this.authRetries += 1;
          try {
            await refreshAccessToken();
            socket.connect();
          } catch {
            this.disconnect();
          }
        }
      });

      this.socket = socket;
      this.pending = null;
      this.notify();
      return socket;
    });

    this.pending = attempt;
    return attempt;
  }

  disconnect() {
    this.pending = null;
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.notify();
    }
  }

  getSocket() {
    return this.socket;
  }
}

export const socketService = new SocketService();
