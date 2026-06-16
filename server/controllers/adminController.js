import User from '../models/User.js';
import Post from '../models/Post.js';
import Room from '../models/Room.js';
import { getIO } from '../socket.js';

export const getStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalPosts = await Post.countDocuments({ isDeleted: { $ne: true } });
    const activeRooms = await Room.countDocuments({ isActive: true, status: 'active' });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    res.json({
      totalUsers,
      totalPosts,
      activeRooms,
      pendingReports: 0, 
      onlineUsers: activeRooms,
      talksToday: await Post.countDocuments({ isDeleted: { $ne: true }, createdAt: { $gte: today } }),
      newUsersToday: await User.countDocuments({ createdAt: { $gte: today } }),
      resolvedReports: 0
    });
  } catch (err) { next(err); }
};

export const getUsers = async (req, res, next) => {
  try {
    const q = req.query.search || '';
    const safe = String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const query = q ? { $or: [{ username: new RegExp(safe, 'i') }, { displayName: new RegExp(safe, 'i') }] } : {};
    const users = await User.find(query).select('-password').limit(50).lean();
    res.json({ users });
  } catch (err) { next(err); }
};

export const getReports = async (req, res, next) => {
  try {
    res.json({ reports: [], total: 0 }); // Future implementation hook
  } catch (err) { next(err); }
};

export const getRooms = async (req, res, next) => {
  try {
    const status = req.query.status;
    const query = status && status !== 'all' ? { status, isActive: true } : { isActive: true };
    const rooms = await Room.find(query).sort({ createdAt: -1 }).limit(50).lean();
    res.json({ rooms });
  } catch (err) { next(err); }
};

export const getAuditLogs = async (req, res, next) => {
  try {
    res.json({ logs: [] }); // Future implementation hook
  } catch (err) { next(err); }
};

export const deleteUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (String(userId) === String(req.user.id)) {
      return res.status(400).json({ message: 'Admins cannot delete themselves' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    await Promise.all([
      User.updateMany({}, { $pull: { followers: userId, following: userId } }),
      Post.updateMany({ author: userId }, { isDeleted: true, deletedAt: new Date() }),
      Room.updateMany({ createdBy: userId }, { isActive: false, status: 'deleted', endTime: new Date() }),
      User.findByIdAndDelete(userId),
    ]);

    res.json({ message: 'User deleted' });
  } catch (err) { next(err); }
};

export const deletePost = async (req, res, next) => {
  try {
    const post = await Post.findOne({ _id: req.params.postId, isDeleted: { $ne: true } });
    if (!post) return res.status(404).json({ message: 'Post not found' });
    post.isDeleted = true;
    post.deletedAt = new Date();
    await post.save();
    res.json({ message: 'Talk removed' });
  } catch (err) { next(err); }
};

export const deleteRoom = async (req, res, next) => {
  try {
    const room = await Room.findOne({ _id: req.params.roomId, isActive: true });
    if (!room) return res.status(404).json({ message: 'Room not found' });
    room.isActive = false;
    room.status = 'deleted';
    room.endTime = new Date();
    await room.save();
    try {
      const io = getIO();
      if (io) {
        io.to(`room:${room._id}`).emit('room:deleted', { roomId: String(room._id) });
        io.emit('rooms:deleted', { roomId: String(room._id) });
      }
    } catch {}
    res.json({ message: 'Debate removed' });
  } catch (err) { next(err); }
};

export const endRoom = async (req, res, next) => {
  try {
    const room = await Room.findOne({ _id: req.params.roomId, isActive: true });
    if (!room) return res.status(404).json({ message: 'Room not found' });
    room.status = 'ended';
    room.endTime = new Date();
    await room.save();
    try {
      const io = getIO();
      if (io) {
        io.to(`room:${room._id}`).emit('debate:ended', { roomId: String(room._id), room });
      }
    } catch {}
    res.json({ message: 'Debate ended', room });
  } catch (err) { next(err); }
};

export default { getStats, getUsers, getReports, getRooms, getAuditLogs, deleteUser, deletePost, deleteRoom, endRoom };
