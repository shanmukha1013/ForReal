// Central configuration. Environment validation (config/env.js) runs before
// this module is first required by server.js.

const isProduction = process.env.NODE_ENV === 'production';

const config = {
  app: {
    port: Number(process.env.PORT) || 5000,
    env: process.env.NODE_ENV || 'development',
    isProduction,
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  },
  db: {
    uri: process.env.MONGODB_URI,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    // Derive a distinct refresh secret when one is not configured explicitly,
    // so access tokens can never be replayed as refresh tokens.
    refreshSecret: process.env.JWT_REFRESH_SECRET || `${process.env.JWT_SECRET}::refresh`,
    accessExpiresIn: '15m',
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: Number(process.env.RATE_LIMIT_MAX) || 1000,
    authMax: Number(process.env.AUTH_RATE_LIMIT_MAX) || 25,
  },
};

module.exports = config;
