const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/config');

const readBearerToken = (req) => {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7);
  return null;
};

const loadUser = async (token) => {
  const decoded = jwt.verify(token, config.jwt.secret);
  const user = await User.findById(decoded.userId).select('-password -refreshToken -previousRefreshToken');
  if (!user || user.status !== 'Active') return null;
  return user;
};

const protect = async (req, res, next) => {
  const token = readBearerToken(req);
  if (!token) {
    res.status(401);
    return next(new Error('Not authorized, no token'));
  }

  try {
    const user = await loadUser(token);
    if (!user) {
      res.status(401);
      return next(new Error('Not authorized, account unavailable'));
    }
    req.user = user;
    return next();
  } catch {
    res.status(401);
    return next(new Error('Not authorized, token failed'));
  }
};

// Attaches req.user when a valid token is present but never rejects the
// request. Used by public endpoints that personalise their response.
const optionalAuth = async (req, res, next) => {
  const token = readBearerToken(req);
  if (!token) return next();
  try {
    const user = await loadUser(token);
    if (user) req.user = user;
  } catch {
    // An expired token on a public route is treated as anonymous access.
  }
  return next();
};

module.exports = { protect, optionalAuth };
