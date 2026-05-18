import express from 'express';
import {
  getUserByUsername,
  getUserProfile,
  updateUserProfile,
  toggleFollow,
  getFollowers,
  getFollowing,
  searchUsers,
} from '../controllers/userController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * User Routes
 */

// GET /api/users/search - Search users by username
router.get('/search', searchUsers);

// GET /api/users/:userId - Get user by ID
router.get('/:userId', getUserProfile);

// GET /api/users/:userId/followers - Get user's followers
router.get('/:userId/followers', getFollowers);

// GET /api/users/:userId/following - Get user's following list
router.get('/:userId/following', getFollowing);

// GET /api/user/:username - Get user by username (legacy endpoint)
router.get('/:username/profile', getUserByUsername);

// POST /api/users/:userId/follow - Toggle follow user (protected)
router.post('/:userId/follow', requireAuth, toggleFollow);

// PUT /api/users/:userId - Update user profile (protected)
router.put('/:userId', requireAuth, updateUserProfile);

export default router;
