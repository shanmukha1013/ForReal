import User from '../models/User.js';

export const getProfile = async (req, res, next) => {
  try {
    const identifier = req.params.identifier;
    const user = await User.findOne({ 
      $or: [{ username: identifier }, { _id: identifier.match(/^[0-9a-fA-F]{24}$/) ? identifier : null }]
    }).select('-password -refreshTokens').lean();
    
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.stats = {
      followersCount: user.followers?.length || 0,
      followingCount: user.following?.length || 0,
      postsCount: user.postsCount || 0
    };

    if (req.user) {
      user.isFollowing = user.followers?.some(id => String(id) === String(req.user.id));
    }
    
    res.json(user);
  } catch (err) { next(err); }
};

export const updateProfile = async (req, res, next) => {
  try {
    if (String(req.user.id) !== String(req.params.userId)) return res.status(403).json({ message: 'Unauthorized' });
    
    const updates = { ...req.body };
    delete updates.password; delete updates.role; delete updates._id;

    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).select('-password -refreshTokens').lean();
    res.json({ user });
  } catch (err) { next(err); }
};

export const toggleFollow = async (req, res, next) => {
  try {
    const targetId = req.params.userId;
    const myId = req.user.id;
    if (targetId === myId) return res.status(400).json({ message: 'Cannot follow yourself' });

    const targetUser = await User.findById(targetId);
    const me = await User.findById(myId);
    if (!targetUser || !me) return res.status(404).json({ message: 'User not found' });

    targetUser.followers = targetUser.followers || [];
    me.following = me.following || [];

    const isFollowing = targetUser.followers.includes(myId);
    if (req.method === 'POST' && !isFollowing) {
      targetUser.followers.push(myId);
      me.following.push(targetId);
    } else if (req.method === 'DELETE' && isFollowing) {
      targetUser.followers = targetUser.followers.filter(id => String(id) !== String(myId));
      me.following = me.following.filter(id => String(id) !== String(targetId));
    } else {
      // Toggle fallback
      if (isFollowing) {
        targetUser.followers = targetUser.followers.filter(id => String(id) !== String(myId));
        me.following = me.following.filter(id => String(id) !== String(targetId));
      } else {
        targetUser.followers.push(myId);
        me.following.push(targetId);
      }
    }

    await targetUser.save();
    await me.save();
    res.json({ success: true, isFollowing: !isFollowing });
  } catch (err) { next(err); }
};

/**
 * Relationship/follow-back state.
 * GET /api/users/:userId/relationship
 */
export const getRelationship = async (req, res, next) => {
  try {
    const targetId = req.params.userId;
    const myId = req.user.id;

    if (!targetId) return res.status(400).json({ message: 'userId required' });

    if (String(targetId) === String(myId)) {
      return res.json({ isFollowing: false, isFollower: false, isMe: true });
    }

    const [targetUser, me] = await Promise.all([
      User.findById(targetId).select('followers following').lean(),
      User.findById(myId).select('following followers').lean(),
    ]);

    if (!targetUser || !me) return res.status(404).json({ message: 'User not found' });

    const targetFollowers = Array.isArray(targetUser.followers) ? targetUser.followers : [];
    const meFollowing = Array.isArray(me.following) ? me.following : [];

    const isFollowing = meFollowing.some((id) => String(id) === String(targetId));
    const isFollower = targetFollowers.some((id) => String(id) === String(myId));

    res.json({
      isFollowing,
      isFollower,
      isMe: false,
    });
  } catch (err) {
    next(err);
  }
};

export default { getProfile, updateProfile, toggleFollow, getRelationship };
