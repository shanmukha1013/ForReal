import express from 'express';
import { register, login, me } from '../controllers/authController.js';
import { updateSettings } from '../controllers/authController.js';
import { refresh } from '../controllers/authController.js';
import { logout } from '../controllers/authController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// POST /api/auth/register
router.post('/register', register);

// POST /api/auth/login
router.post('/login', login);

// GET /api/auth/me (protected)
router.get('/me', requireAuth, me);
// PUT /api/auth/update-settings (protected)
router.put('/update-settings', requireAuth, updateSettings);

// POST /api/auth/refresh
router.post('/refresh', refresh);

// POST /api/auth/logout
router.post('/logout', logout);

export default router;
