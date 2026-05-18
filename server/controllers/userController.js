import User from '../models/User.js';

/**
 * User Controller - Profile and social functionality
 */

// GET /api/users/search - Search users by username
export const searchUsers = async (req, res, next) => {
  try {
    const { q, limit = 10 } = req.query;
    
    if (!q || q.trim().length === 0) {
      return res.json({ users: [] });
    }

    const users = await User.find(
      { username: { $regex: q.trim(), $options: 'i' } },
      '-password -refreshTokens'
    )
      .limit(Math.min(parseInt(limit), 50))
      .lean();

    return res.json({ users });
  } catch (err) {
    console.error('[userController.searchUsers] error:', err);
    next(err);
  }
};

// GET /api/users/:userId - Get user by ID
export const getUserProfile = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .select('-password -refreshTokens')
      .lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({ user });
  } catch (err) {
    console.error('[userController.getUserProfile] error:', err);
    next(err);
  }
};

// GET /api/user/:username - Get user by username (legacy endpoint for backward compatibility)
export const getUserByUsername = async (req, res, next) => {
  try {
    const { username } = req.params;

    const user = await User.findOne({ username })
      .select('-password -refreshTokens')
      .lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({ user });
  } catch (err) {
    console.error('[userController.getUserByUsername] error:', err);
    next(err);
  }
};

// GET /api/users/:userId/followers - Get followers
export const getFollowers = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { limit = 20 } = req.query;

    const user = await User.findById(userId)
      .populate('followers', '-password -refreshTokens')
      .select('followers')
      .lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({
      followers: (user.followers || []).slice(0, Math.min(parseInt(limit), 100)),
      count: user.followers ? user.followers.length : 0,
    });
  } catch (err) {
    console.error('[userController.getFollowers] error:', err);
    next(err);
  }
};

// GET /api/users/:userId/following - Get following list
export const getFollowing = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { limit = 20 } = req.query;

    const user = await User.findById(userId)
      .populate('following', '-password -refreshTokens')
      .select('following')
      .lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({
      following: (user.following || []).slice(0, Math.min(parseInt(limit), 100)),
      count: user.following ? user.following.length : 0,
    });
  } catch (err) {
    console.error('[userController.getFollowing] error:', err);
    next(err);
  }
};

// POST /api/users/:userId/follow - Toggle follow
export const toggleFollow = async (req, res, next) => {
  try {
    const { userId: targetId } = req.params;
    const followerId = req.user.id;

    if (String(followerId) === String(targetId)) {
      return res.status(400).json({ message: 'Cannot follow yourself' });
    }

    const [currentUser, targetUser] = await Promise.all([
      User.findById(followerId),
      User.findById(targetId),
    ]);

    if (!currentUser || !targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isFollowing = currentUser.following && currentUser.following.includes(targetId);

    if (isFollowing) {
      // Unfollow
      currentUser.following = currentUser.following.filter(id => String(id) !== String(targetId));
      targetUser.followers = targetUser.followers.filter(id => String(id) !== String(followerId));
    } else {
      // Follow
      if (!currentUser.following) currentUser.following = [];
      if (!targetUser.followers) targetUser.followers = [];
      currentUser.following.push(targetId);
      targetUser.followers.push(followerId);
    }

    await Promise.all([currentUser.save(), targetUser.save()]);

    return res.json({
      message: isFollowing ? 'Unfollowed' : 'Followed',
      following: !isFollowing,
      followerCount: targetUser.followers ? targetUser.followers.length : 0,
      followingCount: currentUser.following ? currentUser.following.length : 0,
    });
  } catch (err) {
    console.error('[userController.toggleFollow] error:', err);
    next(err);
  }
};

// PUT /api/users/:userId - Update user profile
export const updateUserProfile = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    // Users can only update their own profile
    if (String(userId) !== String(currentUserId)) {
      return res.status(403).json({ message: 'Cannot update other users profile' });
    }

    const { displayName, bio, avatar, email } = req.body;
    const updates = {};

    if (displayName) updates.displayName = displayName;
    if (bio) updates.bio = bio;
    if (avatar) updates.avatar = avatar;
    if (email) updates.email = email;

    const user = await User.findByIdAndUpdate(userId, updates, { new: true })
      .select('-password -refreshTokens');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({ user });
  } catch (err) {
    console.error('[userController.updateUserProfile] error:', err);
    next(err);
  }
};

export default {
  getUserProfile,
  getUserByUsername,
  getFollowers,
  getFollowing,
  toggleFollow,
  updateUserProfile,
  searchUsers,
};
