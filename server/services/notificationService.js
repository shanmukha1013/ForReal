const Notification = require('../models/Notification');
const logger = require('../utils/logger');
const { emitToUser } = require('../sockets');

// Creates a notification and pushes it to the recipient in real time.
// Notifications are a side effect: failures are logged, never surfaced to the
// user whose action triggered them.
// `system` notifications (e.g. "your debate closed") may target the sender.
const notify = async ({ recipient, sender, type, entity, entityModel, message, system = false }) => {
  if (!recipient || !sender) return null;
  if (!system && recipient.toString() === sender.toString()) return null; // no self-notifications

  try {
    const notification = await Notification.create({
      recipient,
      sender,
      type,
      entity,
      entityModel,
      message,
    });
    const populated = await notification.populate('sender', 'username profile.avatar profile.displayName');
    emitToUser(recipient.toString(), 'notification', populated);
    return populated;
  } catch (error) {
    logger.warn(`Notification failed (${type}): ${error.message}`);
    return null;
  }
};

module.exports = { notify };
