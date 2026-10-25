const Notification = require('../models/Notification');
const { successResponse } = require('../utils/apiResponse');
const { httpError, isObjectId, clampInt } = require('../utils/validators');

// @desc    Get the signed-in user's notifications
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res, next) => {
  try {
    const limit = clampInt(req.query.limit, { fallback: 20, max: 50 });
    const page = clampInt(req.query.page, { fallback: 1, max: 1000 });
    const recipient = req.user._id;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find({ recipient })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('sender', 'username profile.avatar profile.displayName')
        .lean(),
      Notification.countDocuments({ recipient }),
      Notification.countDocuments({ recipient, isRead: false }),
    ]);

    return successResponse(res, 200, 'Notifications fetched', {
      notifications,
      unreadCount,
      page,
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Count unread notifications (used for the navigation badge)
// @route   GET /api/notifications/unread-count
// @access  Private
const getUnreadCount = async (req, res, next) => {
  try {
    const unreadCount = await Notification.countDocuments({ recipient: req.user._id, isRead: false });
    return successResponse(res, 200, 'Unread count fetched', { unreadCount });
  } catch (error) {
    return next(error);
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res, next) => {
  try {
    if (!isObjectId(req.params.id)) throw httpError(400, 'Invalid notification id');
    const result = await Notification.updateOne(
      { _id: req.params.id, recipient: req.user._id },
      { $set: { isRead: true } }
    );
    if (result.matchedCount === 0) throw httpError(404, 'Notification not found');

    return successResponse(res, 200, 'Notification marked as read');
  } catch (error) {
    return next(error);
  }
};

// @desc    Mark all as read
// @route   PUT /api/notifications/read-all
// @access  Private
const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { $set: { isRead: true } }
    );

    return successResponse(res, 200, 'All notifications marked as read');
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead
};
