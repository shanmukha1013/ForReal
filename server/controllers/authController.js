const jwt = require('jsonwebtoken');
const User = require('../models/User');
const generateTokens = require('../utils/generateToken');
const {
  clearRefreshCookie,
  setRefreshCookie,
  signAccessToken,
  REFRESH_COOKIE,
} = require('../utils/generateToken');
const { successResponse } = require('../utils/apiResponse');
const logger = require('../utils/logger');
const config = require('../config/config');
const {
  EMAIL_PATTERN,
  httpError,
  asTrimmed,
  normalizeUsername,
  validateUsername,
  validatePassword,
} = require('../utils/validators');

const REFRESH_GRACE_MS = 60 * 1000;

// Fields the client needs to render the signed-in user.
const toSessionUser = (user) => ({
  _id: user._id,
  username: user.username,
  email: user.email,
  role: user.role,
  profile: user.profile,
  stats: {
    followerCount: user.followers?.length || 0,
    followingCount: user.following?.length || 0,
  },
});

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
  try {
    const username = normalizeUsername(req.body.username);
    const email = asTrimmed(req.body.email).toLowerCase();
    const { password } = req.body;

    validateUsername(username);
    if (!EMAIL_PATTERN.test(email) || email.length > 254) {
      throw httpError(400, 'Please enter a valid email address.');
    }
    validatePassword(password);

    const [usernameExists, emailExists] = await Promise.all([
      User.exists({ username }),
      User.exists({ email }),
    ]);
    if (usernameExists) throw httpError(409, 'Username is already taken.');
    if (emailExists) throw httpError(409, 'An account with this email already exists.');

    const user = await User.create({ username, email, password });
    const { accessToken, refreshToken } = generateTokens(res, user._id);
    await User.updateOne({ _id: user._id }, { refreshToken, isOnline: true, lastSeen: Date.now() });

    logger.info(`New user registered: ${username}`);
    return successResponse(res, 201, 'Welcome to ForReal.', { ...toSessionUser(user), accessToken });
  } catch (error) {
    return next(error);
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
  try {
    const username = normalizeUsername(req.body.username);
    const { password, rememberMe } = req.body;

    if (!username || typeof password !== 'string' || !password) {
      throw httpError(400, 'Username and password are required.');
    }

    // Allow signing in with either username or email.
    const user = await User.findOne(username.includes('@') ? { email: username } : { username });
    const isValid = user ? await user.matchPassword(password) : false;

    if (!isValid) throw httpError(401, 'Invalid username or password.');
    if (user.status !== 'Active') throw httpError(403, 'This account is not active.');

    const { accessToken, refreshToken } = generateTokens(res, user._id, Boolean(rememberMe));
    await User.updateOne({ _id: user._id }, { refreshToken, isOnline: true, lastSeen: Date.now() });

    logger.info(`User logged in: ${user.username}`);
    return successResponse(res, 200, 'Welcome back.', { ...toSessionUser(user), accessToken });
  } catch (error) {
    return next(error);
  }
};

// @desc    Rotate the refresh token and issue a new access token
// @route   POST /api/auth/refresh
// @access  Public (requires refresh cookie)
const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies[REFRESH_COOKIE];
    // Visitors without a session are a normal case, not an error: answering
    // 200 keeps guests' browser consoles free of failed requests.
    if (!token) return successResponse(res, 200, 'No active session', { accessToken: null });

    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.refreshSecret);
    } catch {
      clearRefreshCookie(res);
      throw httpError(401, 'Session expired. Please sign in again.');
    }

    const user = await User.findById(decoded.userId)
      .select('refreshToken previousRefreshToken refreshRotatedAt status');
    if (!user || user.status !== 'Active') {
      clearRefreshCookie(res);
      throw httpError(401, 'Session expired. Please sign in again.');
    }

    const rememberMe = Boolean(decoded.rememberMe);

    if (user.refreshToken === token) {
      const tokens = generateTokens(res, user._id, rememberMe);
      await User.updateOne(
        { _id: user._id },
        {
          refreshToken: tokens.refreshToken,
          previousRefreshToken: token,
          refreshRotatedAt: new Date(),
          lastSeen: Date.now(),
        }
      );
      return successResponse(res, 200, 'Token refreshed successfully', { accessToken: tokens.accessToken });
    }

    // A request raced with a rotation that just happened: hand back the
    // current refresh token instead of revoking the session.
    const withinGrace = user.refreshRotatedAt
      && Date.now() - user.refreshRotatedAt.getTime() < REFRESH_GRACE_MS;
    if (token === user.previousRefreshToken && withinGrace && user.refreshToken) {
      setRefreshCookie(res, user.refreshToken, rememberMe);
      return successResponse(res, 200, 'Token refreshed successfully', { accessToken: signAccessToken(user._id) });
    }

    clearRefreshCookie(res);
    throw httpError(401, 'Session expired. Please sign in again.');
  } catch (error) {
    return next(error);
  }
};

// @desc    Logout user / revoke refresh token / clear cookie
// @route   POST /api/auth/logout
// @access  Public — works even when the access token has already expired
const logoutUser = async (req, res, next) => {
  try {
    const token = req.cookies[REFRESH_COOKIE];
    if (token) {
      try {
        const decoded = jwt.verify(token, config.jwt.refreshSecret);
        await User.updateOne(
          { _id: decoded.userId, refreshToken: token },
          { refreshToken: '', previousRefreshToken: '', isOnline: false, lastSeen: Date.now() }
        );
      } catch {
        // Invalid or expired cookie: nothing to revoke.
      }
    }

    clearRefreshCookie(res);
    return successResponse(res, 200, 'Logged out successfully');
  } catch (error) {
    return next(error);
  }
};

// @desc    Get the signed-in user's profile
// @route   GET /api/auth/me
// @access  Private
const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password -refreshToken -previousRefreshToken');
    if (!user) throw httpError(404, 'User not found');
    return successResponse(res, 200, 'User profile fetched successfully', toSessionUser(user));
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  refreshToken,
  logoutUser,
  getUserProfile,
  toSessionUser,
};
