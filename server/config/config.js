// We assume env validation has already run before this is imported in server.js
// but we can also just rely on the env.js being imported first.

const config = {
  app: {
    port: process.env.PORT || 5000,
    env: process.env.NODE_ENV || 'development',
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  },
  db: {
    uri: process.env.MONGODB_URI,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.RATE_LIMIT_MAX || 5000,
  }
};

module.exports = config;
