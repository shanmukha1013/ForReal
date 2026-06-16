import express from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import {
  getStats,
  getUsers,
  getReports,
  getRooms,
  getAuditLogs,
  deleteUser,
  deletePost,
  deleteRoom,
  endRoom,
} from '../controllers/adminController.js';

const router = express.Router();

const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') return next();
  return res.status(403).json({ message: 'Admin access required' });
};

router.use(requireAuth, requireAdmin);
router.get('/stats', getStats);
router.get('/users', getUsers);
router.get('/reports', getReports);
router.get('/rooms', getRooms);
router.get('/audit-logs', getAuditLogs);
router.delete('/users/:userId', deleteUser);
router.delete('/posts/:postId', deletePost);
router.patch('/rooms/:roomId/end', endRoom);
router.delete('/rooms/:roomId', deleteRoom);

export default router;
