const User = require('../models/User');
const { successResponse } = require('../utils/apiResponse');
const logger = require('../utils/logger');
const { notify } = require('../services/notificationService');
const { toSessionUser } = require('./authController');
const {
  httpError,
  isObjectId,
  asString,
  normalizeUsername,
  validateUsername,
  validatePassword,
} = require('../utils/validators');

const PUBLIC_PROFILE_FIELDS = 'username profile role createdAt followers following debateStats badges status';

// @desc    Get a public profile by username
// @route   GET /api/users/:username
// @access  Public (personalised when signed in)
const getUserProfile = async (req, res, next) => {
  try {
    const username = normalizeUsername(req.params.username);
    const user = await User.findOne({ username }).select(PUBLIC_PROFILE_FIELDS).lean();

    if (!user || user.status === 'Banned') throw httpError(404, 'User not found');

    const viewerId = req.user?._id?.toString();
    return successResponse(res, 200, 'User fetched', {
      _id: user._id,
      username: user.username,
      profile: user.profile,
      role: user.role,
      createdAt: user.createdAt,
      stats: {
        followerCount: user.followers?.length || 0,
        followingCount: user.following?.length || 0,
      },
      isFollowing: Boolean(viewerId && user.followers?.some((id) => id.toString() === viewerId)),
      isSelf: viewerId === user._id.toString(),
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Follow a user
// @route   POST /api/users/:id/follow
// @access  Private
const followUser = async (req, res, next) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user._id;

    if (!isObjectId(targetUserId)) throw httpError(400, 'Invalid user id');
    if (targetUserId === currentUserId.toString()) throw httpError(400, 'You cannot follow yourself');

    const target = await User.findOneAndUpdate(
      { _id: targetUserId, status: 'Active' },
      { $addToSet: { followers: currentUserId } },
      { returnDocument: 'after', projection: { followers: 1 } }
    );
    if (!target) throw httpError(404, 'User not found');

    // Filtering on $ne makes matchedCount tell us whether this is a new follow
    // (modifiedCount is unreliable because timestamps always bump updatedAt).
    const result = await User.updateOne(
      { _id: currentUserId, following: { $ne: target._id } },
      { $addToSet: { following: target._id } }
    );
    if (result.matchedCount > 0) {
      notify({
        recipient: target._id,
        sender: currentUserId,
        type: 'follow',
        entity: currentUserId,
        entityModel: 'User',
      });
    }

    return successResponse(res, 200, 'Successfully followed user', {
      isFollowing: true,
      followerCount: target.followers.length,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Unfollow a user
// @route   POST /api/users/:id/unfollow
// @access  Private
const unfollowUser = async (req, res, next) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user._id;

    if (!isObjectId(targetUserId)) throw httpError(400, 'Invalid user id');

    const target = await User.findByIdAndUpdate(
      targetUserId,
      { $pull: { followers: currentUserId } },
      { returnDocument: 'after', projection: { followers: 1 } }
    );
    if (!target) throw httpError(404, 'User not found');

    await User.updateOne({ _id: currentUserId }, { $pull: { following: target._id } });

    return successResponse(res, 200, 'Successfully unfollowed user', {
      isFollowing: false,
      followerCount: target.followers.length,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Update the signed-in user's profile (and optionally password)
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) throw httpError(404, 'User not found');

    const { username, displayName, bio, password, currentPassword } = req.body;

    if (username !== undefined) {
      const normalized = normalizeUsername(username);
      validateUsername(normalized);
      if (normalized !== user.username) {
        const taken = await User.exists({ username: normalized, _id: { $ne: user._id } });
        if (taken) throw httpError(409, 'Username is already taken');
        user.username = normalized;
      }
    }

    if (displayName !== undefined) {
      const value = asString(displayName).trim();
      if (value.length > 50) throw httpError(400, 'Display name must be 50 characters or fewer.');
      user.profile.displayName = value;
    }

    if (bio !== undefined) {
      const value = asString(bio).trim();
      if (value.length > 280) throw httpError(400, 'Bio must be 280 characters or fewer.');
      user.profile.bio = value;
    }

    if (password !== undefined) {
      validatePassword(password);
      // Changing the password requires proof of the current one.
      const matches = typeof currentPassword === 'string' && (await user.matchPassword(currentPassword));
      if (!matches) throw httpError(400, 'Your current password is incorrect.');
      user.password = password;
    }

    const updatedUser = await user.save();
    logger.info(`Profile updated for user ${updatedUser._id}`);

    return successResponse(res, 200, 'Profile updated', toSessionUser(updatedUser));
  } catch (error) {
    return next(error);
  }
};

// @desc    Upload profile picture
// @route   POST /api/users/profile-picture
// @access  Private
const uploadProfilePicture = async (req, res, next) => {
  try {
    if (!req.file) throw httpError(400, 'Please choose an image to upload.');

    // Files are served by express.static from /uploads. Production deployments
    // on ephemeral disks should swap this for object storage (S3, Cloudinary).
    const avatarUrl = `/uploads/${req.file.filename}`;
    await User.updateOne({ _id: req.user._id }, { 'profile.avatar': avatarUrl });

    return successResponse(res, 200, 'Profile picture updated', { avatarUrl });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getUserProfile,
  followUser,
  unfollowUser,
  updateProfile,
  uploadProfilePicture,
};
