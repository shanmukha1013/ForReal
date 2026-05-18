import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-prod';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_EXPIRES_IN = process.env.REFRESH_EXPIRES_IN || '7d';

function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function signRefreshToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
}

export const register = async (req, res) => {
  try {
    const { username, email, password, displayName } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'username, email and password are required' });
    }

    // Check unique constraints
    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) {
      if (existing.username === username) return res.status(409).json({ message: 'Username already taken' });
      return res.status(409).json({ message: 'Email already registered' });
    }

    const user = new User({ username, email, password, displayName });
    await user.save();

    const token = signToken(user);
    const refreshToken = signRefreshToken(user);
    // persist refresh token (simple approach)
    user.refreshTokens = user.refreshTokens.concat([refreshToken]);
    await user.save();
    // set HttpOnly cookie for refresh token
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    });
    return res.status(201).json({ token, refreshToken, user: user.toJSON() });
  } catch (err) {
    console.error('[auth][register] error', err);
    const message = process.env.NODE_ENV === 'development' ? (err.message || String(err)) : 'Internal server error';
    return res.status(500).json({ message });
  }
};

export const login = async (req, res) => {
  try {
    const { identifier, password } = req.body; // identifier can be username or email
    if (!identifier || !password) return res.status(400).json({ message: 'identifier and password required' });

    const user = await User.findOne({ $or: [{ username: identifier }, { email: identifier }] });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const token = signToken(user);
    const refreshToken = signRefreshToken(user);
    user.refreshTokens = user.refreshTokens.concat([refreshToken]);
    await user.save();
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });
    return res.json({ token, refreshToken, user: user.toJSON() });
  } catch (err) {
    console.error('[auth][login] error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// POST /api/auth/refresh
export const refresh = async (req, res) => {
  try {
    // Accept refreshToken via body or HttpOnly cookie
    const refreshToken = (req.body && req.body.refreshToken) || req.cookies?.refreshToken;
    if (!refreshToken) return res.status(400).json({ message: 'refreshToken required' });

    let payload;
    try {
      payload = jwt.verify(refreshToken, JWT_SECRET);
    } catch (err) {
      const msg = err.name === 'TokenExpiredError' ? 'refresh_token_expired' : 'refresh_token_invalid';
      return res.status(401).json({ message: msg });
    }

    const user = await User.findById(payload.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Ensure refresh token is one we issued
    if (!user.refreshTokens || !user.refreshTokens.includes(refreshToken)) {
      return res.status(401).json({ message: 'refresh_token_revoked' });
    }

    // Issue new access token (do not rotate refresh token for now)
    const token = signToken(user);
    return res.json({ token });
  } catch (err) {
    console.error('[auth][refresh] error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const logout = async (req, res) => {
  try {
    const refreshToken = (req.body && req.body.refreshToken) || req.cookies?.refreshToken;
    if (!refreshToken) {
      // Clear cookie anyway
      res.clearCookie('refreshToken');
      return res.json({ ok: true });
    }
    let payload;
    try {
      payload = jwt.verify(refreshToken, JWT_SECRET);
    } catch (e) {
      res.clearCookie('refreshToken');
      return res.json({ ok: true });
    }

    const user = await User.findById(payload.id);
    if (user && user.refreshTokens && user.refreshTokens.includes(refreshToken)) {
      user.refreshTokens = user.refreshTokens.filter((t) => t !== refreshToken);
      await user.save();
    }

    res.clearCookie('refreshToken');
    return res.json({ ok: true });
  } catch (err) {
    console.error('[auth][logout] error', err);
    res.clearCookie('refreshToken');
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const me = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json({ user });
  } catch (err) {
    console.error('[auth][me] error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const updates = req.body || {};
    // Whitelist fields to avoid accidental privilege escalation
    const allowed = ['displayName', 'bio', 'avatar', 'email', 'privacy', 'notifications', 'appearance'];
    const payload = {};
    for (const k of allowed) {
      if (typeof updates[k] !== 'undefined') payload[k] = updates[k];
    }

    const user = await User.findByIdAndUpdate(req.user.id, payload, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json({ user });
  } catch (err) {
    console.error('[auth][updateSettings] error', err);
    return res.status(500).json({ message: 'Failed to update settings' });
  }
};

// GET /api/auth/sessions - Get active sessions (minimal implementation)
export const getSessions = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // Return minimal session info (mock - real implementation would track actual sessions)
    const sessions = [
      {
        _id: 'current-session',
        device: 'Current Browser',
        lastActive: new Date(),
        ip: req.ip,
      },
    ];
    return res.json({ sessions });
  } catch (err) {
    console.error('[auth][getSessions] error', err);
    return res.status(500).json({ message: 'Failed to get sessions' });
  }
};

// POST /api/auth/change-password - Change user password
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    return res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('[auth][changePassword] error', err);
    return res.status(500).json({ message: 'Failed to change password' });
  }
};

// DELETE /api/auth/sessions/:sessionId - Terminate a session
export const terminateSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (sessionId === 'current-session') {
      // Logout current session
      const user = await User.findById(req.user.id);
      if (user) {
        const refreshToken = req.cookies?.refreshToken;
        if (refreshToken && user.refreshTokens) {
          user.refreshTokens = user.refreshTokens.filter(t => t !== refreshToken);
          await user.save();
        }
      }
      res.clearCookie('refreshToken');
      return res.json({ message: 'Session terminated' });
    }
    
    return res.json({ message: 'Session terminated' });
  } catch (err) {
    console.error('[auth][terminateSession] error', err);
    return res.status(500).json({ message: 'Failed to terminate session' });
  }
};

export default { register, login, me };
