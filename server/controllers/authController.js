const User = require('../models/User');
const generateTokens = require('../utils/generateToken');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const logger = require('../utils/logger');
const jwt = require('jsonwebtoken');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    const normalizedUsername = username.trim().toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();

    const usernameExists = await User.findOne({ username: normalizedUsername });
    if (usernameExists) {
      res.status(400);
      throw new Error('Username is already taken.');
    }

    const emailExists = await User.findOne({ email: normalizedEmail });
    if (emailExists) {
      res.status(400);
      throw new Error('An account with this email already exists.');
    }

    const user = await User.create({
      username: normalizedUsername,
      email: normalizedEmail,
      password,
    });

    if (user) {
      const { accessToken, refreshToken } = generateTokens(res, user._id);
      
      user.refreshToken = refreshToken;
      await user.save();

      logger.info(`New user registered: ${username}`);
      return successResponse(res, 201, 'User registered successfully', {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        accessToken,
      });
    } else {
      res.status(400);
      throw new Error('Invalid user data');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
  try {
    const { username, password, rememberMe } = req.body;

    if (!username) {
      res.status(400);
      throw new Error('Username is required');
    }

    const normalizedUsername = username.trim().toLowerCase();

    const user = await User.findOne({ username: normalizedUsername });

    if (user && (await user.matchPassword(password))) {
      const { accessToken, refreshToken } = generateTokens(res, user._id, rememberMe);
      
      user.refreshToken = refreshToken;
      user.isOnline = true;
      user.lastSeen = Date.now();
      await user.save();

      logger.info(`User logged in: ${user.username}`);
      return successResponse(res, 200, 'Login successful', {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        profile: user.profile,
        accessToken,
      });
    } else {
      res.status(401);
      throw new Error('Invalid username or password.');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public (requires refresh cookie)
const refreshToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.jwt_refresh;

    if (!refreshToken) {
      res.status(401);
      throw new Error('No refresh token found');
    }

    const refreshSecret = process.env.JWT_REFRESH_SECRET || 'supersecretrefreshkey_replace_me_in_production';
    const decoded = jwt.verify(refreshToken, refreshSecret);

    const user = await User.findById(decoded.userId);

    if (!user || user.refreshToken !== refreshToken) {
      res.status(401);
      throw new Error('Invalid refresh token');
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(res, user._id, true);
    
    user.refreshToken = newRefreshToken;
    await user.save();

    return successResponse(res, 200, 'Token refreshed successfully', {
      accessToken,
    });
  } catch (error) {
    res.status(401);
    next(new Error('Invalid refresh token'));
  }
};

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Public
const logoutUser = async (req, res) => {
  if (req.user) {
    const user = await User.findById(req.user._id);
    if (user) {
      user.refreshToken = '';
      user.isOnline = false;
      user.lastSeen = Date.now();
      await user.save();
    }
  }

  res.cookie('jwt_refresh', '', {
    httpOnly: true,
    expires: new Date(0),
  });
  logger.info('User logged out');
  return successResponse(res, 200, 'Logged out successfully');
};

// @desc    Get user profile
// @route   GET /api/auth/me
// @access  Private
const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      return successResponse(res, 200, 'User profile fetched successfully', {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        credibilityScore: user.credibilityScore,
        badges: user.badges,
        profile: user.profile
      });
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  refreshToken,
  logoutUser,
  getUserProfile,
};
