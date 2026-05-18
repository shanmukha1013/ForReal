import User from '../models/User.js';
import Post from '../models/Post.js';
import Room from '../models/Room.js';

export const getStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalPosts = await Post.countDocuments({ isDeleted: { $ne: true } });
    const activeRooms = await Room.countDocuments({ status: 'active' });
    
    res.json({
      totalUsers,
      totalPosts,
      activeRooms,
      pendingReports: 0, 
      onlineUsers: activeRooms * 3, // rough estimate mockup based on active rooms
      talksToday: 12,
      newUsersToday: 4,
      resolvedReports: 0
    });
  } catch (err) { next(err); }
};

export const getUsers = async (req, res, next) => {
  try {
    const q = req.query.search || '';
    const query = q ? { $or: [{ username: new RegExp(q, 'i') }, { displayName: new RegExp(q, 'i') }] } : {};
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
    const rooms = await Room.find({ status: 'active' }).limit(50).lean();
    res.json({ rooms });
  } catch (err) { next(err); }
};

export const getAuditLogs = async (req, res, next) => {
  try {
    res.json({ logs: [] }); // Future implementation hook
  } catch (err) { next(err); }
};

export default { getStats, getUsers, getReports, getRooms, getAuditLogs };