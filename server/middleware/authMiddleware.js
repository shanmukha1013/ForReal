import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-prod';

export const requireAuth = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing authorization token' });
  }

  const token = auth.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = { id: decoded.id, role: decoded.role };
    return next();
  } catch (err) {
    console.error('[authMiddleware] token error', err.message);
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'token_expired' });
    }
    return res.status(401).json({ message: 'token_invalid' });
  }
};

export default requireAuth;
