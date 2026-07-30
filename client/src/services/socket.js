import { io } from 'socket.io-client';

const URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : '/';

class SocketService {
  constructor() {
    this.socket = null;
    this.token = null;
  }

  connect(token) {
    this.token = token;
    
    if (this.socket) {
      if (this.socket.connected) return this.socket;
      this.socket.disconnect();
    }

    this.socket = io(URL, {
      auth: {
        token: this.token
      },
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket() {
    return this.socket;
  }
}

export const socketService = new SocketService();
