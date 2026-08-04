const jwt = require('jsonwebtoken');

const generateTokens = (res, userId, rememberMe = false) => {
  const secret = process.env.JWT_SECRET || 'supersecretjwtkey_replace_me_in_production';
  const refreshSecret = process.env.JWT_REFRESH_SECRET || 'supersecretrefreshkey_replace_me_in_production';

  // Access token: short lived
  const accessToken = jwt.sign({ userId }, secret, {
    expiresIn: '15m',
  });

  // Refresh token: long lived
  const refreshTokenExpires = rememberMe ? '30d' : '1d';
  const refreshToken = jwt.sign({ userId }, refreshSecret, {
    expiresIn: refreshTokenExpires,
  });

  // Set refresh token in httpOnly cookie
  const maxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const isProduction = process.env.NODE_ENV !== 'development';
  res.cookie('jwt_refresh', refreshToken, {
    httpOnly: true,
    secure: isProduction, // Use secure cookies in production
    sameSite: isProduction ? 'none' : 'lax', // Allow cross-site cookies in production
    maxAge,
  });

  return { accessToken, refreshToken };
};

module.exports = generateTokens;
