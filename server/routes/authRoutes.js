const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const {
  registerUser,
  loginUser,
  logoutUser,
  getUserProfile,
  refreshToken,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const config = require('../config/config');

// Brute-force protection for credential endpoints. Successful sign-ins do not
// count against the limit.
const credentialLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  limit: config.rateLimit.authMax,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please wait a few minutes and try again.' },
});

router.post('/register', credentialLimiter, registerUser);
router.post('/login', credentialLimiter, loginUser);
router.post('/refresh', refreshToken);
router.post('/logout', logoutUser);
router.get('/me', protect, getUserProfile);

module.exports = router;
