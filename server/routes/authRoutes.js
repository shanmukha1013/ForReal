import express from 'express';
import { register, login, me } from '../controllers/authController.js';
import { updateSettings } from '../controllers/authController.js';
import { refresh } from '../controllers/authController.js';
import { logout } from '../controllers/authController.js';
import { getSessions, changePassword, terminateSession } from '../controllers/authController.js';
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

// GET /api/auth/sessions (protected) - session management
router.get('/sessions', requireAuth, getSessions);

// POST /api/auth/change-password (protected) - password change
router.post('/change-password', requireAuth, changePassword);

// DELETE /api/auth/sessions/:sessionId (protected) - terminate session
router.delete('/sessions/:sessionId', requireAuth, terminateSession);

export default router;
