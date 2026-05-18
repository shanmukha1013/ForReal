import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { getIO } from '../socket.js';

export const createOrSendMessage = async (req, res, next) => {
  try {
    const { text, recipientId, conversationId } = req.body || {};
    const senderId = req.user.id;

    if (!text) return res.status(400).json({ message: 'Text is required' });

    let convId = conversationId;
    if (!convId && recipientId) {
      let conv = await Conversation.findOne({ participants: { $all: [senderId, recipientId], $size: 2 } });
      if (!conv) {
        conv = new Conversation({ participants: [senderId, recipientId] });
        await conv.save();
      }
      convId = conv._id;
    }

    if (!convId) return res.status(400).json({ message: 'Conversation or recipient required' });

    const senderData = await User.findById(senderId).select('username displayName avatar');
    const message = new Message({ conversationId: convId, sender: senderId, text });
    await message.save();

    const populatedMessage = { ...message.toObject(), sender: senderData };
    await Conversation.findByIdAndUpdate(convId, { lastMessage: populatedMessage });

    const io = getIO();
    if (io) io.to(`dm:conv:${convId}`).emit('dm:new', populatedMessage);

    if (res && typeof res.json === 'function') return res.json(populatedMessage);
    return populatedMessage;
  } catch (err) {
    if (res && typeof res.status === 'function') {
      return res.status(500).json({ message: 'Chat controller error' });
    }
    throw err;
  }
};

/**
 * Get user conversations
 * GET /api/chat/conversations
 */
export const getConversations = async (req, res, next) => {
  try {
    const conversations = await Conversation.find({ participants: req.user.id })
      .populate('participants', 'username displayName avatar status')
      .sort({ updatedAt: -1 })
      .lean();
    res.json(conversations);
  } catch (err) { next(err); }
};

/**
 * Get messages for a specific conversation
 * GET /api/chat/:conversationId
 */
export const getMessages = async (req, res, next) => {
  try {
    const messages = await Message.find({ conversationId: req.params.conversationId })
      .populate('sender', 'username displayName avatar')
      .sort({ createdAt: 1 })
      .lean();
    res.json(messages);
  } catch (err) { next(err); }
};

/**
 * Mark a conversation as read
 * POST /api/chat/:conversationId/read
 */
export const markConversationRead = async (req, res, next) => {
  try {
    await Message.updateMany({ conversationId: req.params.conversationId, sender: { $ne: req.user.id } }, { read: true });
    res.json({ ok: true });
  } catch (err) { next(err); }
};

/**
 * Get unread notifications
 * GET /api/chat/notifications
 */
export const getNotifications = async (req, res, next) => {
  try {
    res.json({ notifications: [] });
  } catch (err) { next(err); }
};

/**
 * Mark a notification as read
 * POST /api/chat/notifications/:id/read
 */
export const markNotificationRead = async (req, res, next) => {
  try {
    res.json({ ok: true });
  } catch (err) { next(err); }
};

export default {
  createOrSendMessage,
  getConversations,
  getMessages,
  markConversationRead,
  getNotifications,
  markNotificationRead
};
