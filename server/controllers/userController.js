import User from '../models/User.js';
import Post from '../models/Post.js';
import Follow from '../models/Follow.js';
import Notification from '../models/Notification.js';
import { emitNotification } from '../socket.js';

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

    const followersCount = await Follow.countDocuments({ followingId: user._id });
    const followingCount = await Follow.countDocuments({ followerId: user._id });

    user.stats = {
      followersCount: followersCount || user.followers?.length || 0,
      followingCount: followingCount || user.following?.length || 0,
      postsCount
    };

    if (req.user) {
      const isFollowing = await Follow.exists({ followerId: req.user.id, followingId: user._id });
      const isFollower = await Follow.exists({ followerId: user._id, followingId: req.user.id });
      user.isFollowing = !!isFollowing;
      user.isFollower = !!isFollower;
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
      .select('username displayName avatar bio credibility verified followers following')
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

export const getSuggestedUsers = async (req, res, next) => {
  try {
    const myId = req.user.id;
    // Find users the current user is following
    const myFollowing = await Follow.find({ followerId: myId }).select('followingId').lean();
    const followingIds = myFollowing.map(f => f.followingId);
    followingIds.push(myId); // Exclude myself

    // Suggest users based on high credibility or recently joined, who I don't already follow
    const suggestions = await User.find({
      _id: { $nin: followingIds }
    })
      .select('username displayName avatar bio credibility verified')
      .sort({ credibility: -1, createdAt: -1 })
      .limit(10)
      .lean();

    res.json({ suggestions });
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

    const existingFollow = await Follow.findOne({ followerId: myId, followingId: targetId });

    targetUser.followers = targetUser.followers || [];
    me.following = me.following || [];

    if (req.method === 'POST' && !existingFollow) {
      await Follow.create({ followerId: myId, followingId: targetId });
      
      // Update arrays for backward compatibility
      if (!targetUser.followers.includes(myId)) targetUser.followers.push(myId);
      if (!me.following.includes(targetId)) me.following.push(targetId);

      // Create Notification
      const notif = await Notification.create({
        userId: targetId,
        type: 'follow',
        actorId: myId,
        payload: {
          title: 'New Follower',
          body: `${me.username || 'Someone'} started following you`,
        }
      });
      // Emit socket event
      emitNotification(targetId, notif);
    } else if (req.method === 'DELETE' && existingFollow) {
      await Follow.deleteOne({ _id: existingFollow._id });
      
      // Update arrays
      targetUser.followers = targetUser.followers.filter(id => String(id) !== String(myId));
      me.following = me.following.filter(id => String(id) !== String(targetId));
    }

    await targetUser.save();
    await me.save();
    
    const nowFollowing = req.method === 'DELETE' ? false : true;
    const followersCount = await Follow.countDocuments({ followingId: targetId });
    const followingCount = await Follow.countDocuments({ followerId: myId });

    res.json({
      success: true,
      isFollowing: nowFollowing,
      followersCount,
      followingCount,
    });
  } catch (err) { next(err); }
};

export const getRelationship = async (req, res, next) => {
  try {
    const targetId = req.params.userId;
    const myId = req.user.id;

    if (!targetId) return res.status(400).json({ message: 'userId required' });

    if (String(targetId) === String(myId)) {
      return res.json({ isFollowing: false, isFollower: false, isMe: true });
    }

    const isFollowing = await Follow.exists({ followerId: myId, followingId: targetId });
    const isFollower = await Follow.exists({ followerId: targetId, followingId: myId });

    res.json({
      isFollowing: !!isFollowing,
      isFollower: !!isFollower,
      isMe: false,
    });
  } catch (err) {
    next(err);
  }
};

export const getFollowers = async (req, res, next) => {
  try {
    const targetId = req.params.userId;
    const follows = await Follow.find({ followingId: targetId })
      .populate('followerId', 'username displayName avatar bio credibility verified')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    
    res.json({ followers: follows.map(f => f.followerId).filter(Boolean) });
  } catch (err) {
    next(err);
  }
};

export const getFollowing = async (req, res, next) => {
  try {
    const targetId = req.params.userId;
    const follows = await Follow.find({ followerId: targetId })
      .populate('followingId', 'username displayName avatar bio credibility verified')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    
    res.json({ following: follows.map(f => f.followingId).filter(Boolean) });
  } catch (err) {
    next(err);
  }
};

export default { getProfile, searchUsers, updateProfile, toggleFollow, getRelationship, getSuggestedUsers, getFollowers, getFollowing };
