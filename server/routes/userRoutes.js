import express from 'express';
import { getProfile, searchUsers, updateProfile, toggleFollow, getRelationship, getSuggestedUsers, getFollowers, getFollowing } from '../controllers/userController.js';
import { requireAuth, optionalAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// User discovery (public)
router.get('/search', searchUsers);

// Suggested users (auth required)
router.get('/suggested', requireAuth, getSuggestedUsers);

// Relationship/followback state (auth required)
router.get('/:userId/relationship', requireAuth, getRelationship);

// Get followers and following lists
router.get('/:userId/followers', getFollowers);
router.get('/:userId/following', getFollowing);

// Profile fetch (public)
router.get('/:identifier', optionalAuth, getProfile);

// Update own profile (auth required)
router.put('/:userId', requireAuth, updateProfile);

// Follow/unfollow toggle (supports POST + DELETE) (auth required)
router.all('/:userId/follow', requireAuth, toggleFollow);

export default router;
