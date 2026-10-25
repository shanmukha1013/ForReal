const jwt = require('jsonwebtoken');
const config = require('../config/config');

const REFRESH_COOKIE = 'jwt_refresh';

const cookieOptions = () => {
  // Cross-site cookies are required when the client (Vercel) and API (Render)
  // live on different domains in production.
  const secure = config.app.env !== 'development' && config.app.env !== 'test';
  return {
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' : 'lax',
    path: '/api/auth',
  };
};

const generateTokens = (res, userId, rememberMe = false) => {
  const accessToken = signAccessToken(userId);

  const refreshToken = jwt.sign({ userId, rememberMe: Boolean(rememberMe) }, config.jwt.refreshSecret, {
    expiresIn: rememberMe ? '30d' : '1d',
  });

  setRefreshCookie(res, refreshToken, rememberMe);

  return { accessToken, refreshToken };
};

const setRefreshCookie = (res, refreshToken, rememberMe) => {
  const maxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  res.cookie(REFRESH_COOKIE, refreshToken, { ...cookieOptions(), maxAge });
};

const signAccessToken = (userId) =>
  jwt.sign({ userId }, config.jwt.secret, { expiresIn: config.jwt.accessExpiresIn });

const clearRefreshCookie = (res) => {
  res.clearCookie(REFRESH_COOKIE, cookieOptions());
  // Older builds set the cookie on the default path; clear that one too.
  res.clearCookie(REFRESH_COOKIE, { ...cookieOptions(), path: '/' });
};

module.exports = generateTokens;
module.exports.clearRefreshCookie = clearRefreshCookie;
module.exports.setRefreshCookie = setRefreshCookie;
module.exports.signAccessToken = signAccessToken;
module.exports.REFRESH_COOKIE = REFRESH_COOKIE;
