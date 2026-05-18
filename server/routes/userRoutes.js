import express from 'express';
import { getProfile, updateProfile, toggleFollow, getRelationship } from '../controllers/userController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// Profile fetch (public)
router.get('/:identifier', getProfile);

// Relationship/followback state (auth required)
router.get('/:userId/relationship', requireAuth, getRelationship);

// Update own profile (auth required)
router.put('/:userId', requireAuth, updateProfile);

// Follow/unfollow toggle (supports POST + DELETE) (auth required)
router.all('/:userId/follow', requireAuth, toggleFollow);

export default router;


