import User from '../models/User.js';
import Post from '../models/Post.js';

const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const getProfile = async (req, res, next) => {
  try {
    const identifier = req.params.identifier;
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(identifier);
    const user = await User.findOne({ 
      $or: [{ username: String(identifier).toLowerCase() }, ...(isObjectId ? [{ _id: identifier }] : [])]
    }).select('-password -refreshTokens').lean();
    
    if (!user) return res.status(404).json({ message: 'User not found' });

    const postsCount = await Post.countDocuments({
      author: user._id,
      isDeleted: { $ne: true },
    });

    user.stats = {
      followersCount: user.followers?.length || 0,
      followingCount: user.following?.length || 0,
      postsCount
    };

    if (req.user) {
      user.isFollowing = user.followers?.some(id => String(id) === String(req.user.id));
      const me = await User.findById(req.user.id).select('followers').lean();
      user.isFollower = me?.followers?.some(id => String(id) === String(user._id)) || false;
    }
    
    res.json(user);
  } catch (err) { next(err); }
};

export const searchUsers = async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.json({ users: [] });

    const pattern = new RegExp(escapeRegex(q), 'i');
    const users = await User.find({
      $or: [{ username: pattern }, { displayName: pattern }],
    })
      .select('username displayName avatar credibility verified followers following')
      .limit(15)
      .lean();

    res.json({
      users: users.map((user) => ({
        ...user,
        stats: {
          followersCount: user.followers?.length || 0,
          followingCount: user.following?.length || 0,
        },
      })),
    });
  } catch (err) {
    next(err);
  }
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

    const isFollowing = targetUser.followers.some(id => String(id) === String(myId));
    if (req.method === 'POST' && !isFollowing) {
      targetUser.followers.push(myId);
      if (!me.following.some(id => String(id) === String(targetId))) {
        me.following.push(targetId);
      }
    } else if (req.method === 'DELETE' && isFollowing) {
      targetUser.followers = targetUser.followers.filter(id => String(id) !== String(myId));
      me.following = me.following.filter(id => String(id) !== String(targetId));
    }

    await targetUser.save();
    await me.save();
    const nowFollowing = req.method === 'DELETE' ? false : true;
    res.json({
      success: true,
      isFollowing: nowFollowing,
      followersCount: targetUser.followers.length,
      followingCount: me.following.length,
    });
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

    const meFollowing = Array.isArray(me.following) ? me.following : [];
    const myFollowers = Array.isArray(me.followers) ? me.followers : [];

    const isFollowing = meFollowing.some((id) => String(id) === String(targetId));
    const isFollower = myFollowers.some((id) => String(id) === String(targetId));

    res.json({
      isFollowing,
      isFollower,
      isMe: false,
    });
  } catch (err) {
    next(err);
  }
};

export default { getProfile, searchUsers, updateProfile, toggleFollow, getRelationship };
