let ioInstance = null;

export function setIO(io) {
  ioInstance = io;
}

export function getIO() {
  return ioInstance;
}

export function emitRoomsNew(room) {
  try {
    if (!ioInstance) return false;
    // Broadcast to all connected sockets
    ioInstance.emit('rooms:new', room);
    return true;
  } catch (err) {
    console.error('[socket] emitRoomsNew error', err);
    return false;
  }
}

export default { setIO, getIO, emitRoomsNew };
