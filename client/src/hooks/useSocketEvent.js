import { useEffect, useRef, useSyncExternalStore } from 'react';
import { socketService } from '@/services/socket';

// The current socket instance (null until connected); re-renders when the
// instance is created or torn down.
export const useSocket = () => {
  useSyncExternalStore(socketService.subscribe, socketService.getVersion, socketService.getVersion);
  return socketService.getSocket();
};

// Subscribes to a socket event for the lifetime of the component. The latest
// handler is always called, so callers do not need to memoise it.
export const useSocketEvent = (event, handler, enabled = true) => {
  const socket = useSocket();
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    if (!enabled || !socket) return undefined;
    const listener = (...args) => handlerRef.current?.(...args);
    socket.on(event, listener);
    return () => socket.off(event, listener);
  }, [socket, event, enabled]);
};
