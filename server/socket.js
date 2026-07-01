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
    ioInstance.emit('rooms:new', room);
    return true;
  } catch (err) {
    console.error('[socket] emitRoomsNew error', err);
    return false;
  }
}

export function emitNotification(userId, notification) {
  try {
    if (!ioInstance) return false;
    ioInstance.to(`notify:user:${userId}`).emit('notification:new', notification);
    return true;
  } catch (err) {
    console.error('[socket] emitNotification error', err);
    return false;
  }
}

export function emitPostLikeUpdate(postId, likes) {
  try {
    if (!ioInstance) return false;
    ioInstance.emit('post:likeUpdate', { postId, likes });
    return true;
  } catch (err) {
    console.error('[socket] emitPostLikeUpdate error', err);
    return false;
  }
}

export default { setIO, getIO, emitRoomsNew, emitNotification, emitPostLikeUpdate };
