import express from 'express';
import {
  getRooms,
  getRoom,
  createRoom,
  joinRoom,
  leaveRoom,
  endRoom,
  deleteRoom,
} from '../controllers/roomController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * Room Routes
 */

// Public routes
router.get('/', getRooms);
router.get('/:id', getRoom);

// Protected routes
router.post('/', requireAuth, createRoom);
router.post('/:id/join', requireAuth, joinRoom);
router.post('/:id/leave', requireAuth, leaveRoom);
router.patch('/:id/end', requireAuth, endRoom);
router.delete('/:id', requireAuth, deleteRoom);

export default router;
