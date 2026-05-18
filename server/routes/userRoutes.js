import express from 'express';
import { getProfile, updateProfile, toggleFollow } from '../controllers/userController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/:identifier', getProfile);
router.put('/:userId', requireAuth, updateProfile);
router.all('/:userId/follow', requireAuth, toggleFollow); // Supports POST and DELETE

export default router;