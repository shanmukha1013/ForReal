const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const { successResponse } = require('../utils/apiResponse');
const { emitToUser } = require('../sockets');
const { httpError, isObjectId, asTrimmed, asString, clampInt } = require('../utils/validators');

const PARTICIPANT_FIELDS = 'username profile.avatar profile.displayName isOnline lastSeen';
const SENDER_FIELDS = 'username profile.avatar profile.displayName';

const serializeConversation = (conversation, userId) => {
  const unreadCounts = conversation.unreadCounts instanceof Map
    ? Object.fromEntries(conversation.unreadCounts)
    : conversation.unreadCounts || {};
  return {
    ...conversation,
    unreadCounts,
    unread: unreadCounts[userId.toString()] || 0,
  };
};

const findRecipient = async (recipientId, senderId) => {
  if (!isObjectId(recipientId)) throw httpError(400, 'Invalid recipient');
  if (recipientId === senderId.toString()) throw httpError(400, 'You cannot message yourself.');
  const recipient = await User.findOne({ _id: recipientId, status: 'Active' }).select('_id').lean();
  if (!recipient) throw httpError(404, 'That user is not available.');
  return recipient;
};

// @desc    Get all conversations for the signed-in user
// @route   GET /api/messages/conversations
// @access  Private
const getConversations = async (req, res, next) => {
  try {
    const conversations = await Conversation.find({ participants: req.user._id })
      .populate('participants', PARTICIPANT_FIELDS)
      .populate('lastMessage', 'content sender createdAt')
      .sort({ lastActivity: -1 })
      .limit(100)
      .lean();

    return successResponse(res, 200, 'Conversations fetched', conversations.map((c) => serializeConversation(c, req.user._id)));
  } catch (error) {
    return next(error);
  }
};

// @desc    Get messages for a conversation (newest page first, returned oldest→newest)
// @route   GET /api/messages/:conversationId
// @access  Private
const getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    if (!isObjectId(conversationId)) throw httpError(400, 'Invalid conversation');

    const limit = clampInt(req.query.limit, { fallback: 50, max: 100 });
    const cursor = asString(req.query.cursor);

    const isMember = await Conversation.exists({ _id: conversationId, participants: req.user._id });
    if (!isMember) throw httpError(403, 'Not authorized to view these messages');

    const query = { conversation: conversationId, isDeleted: false };
    if (cursor) {
      if (!isObjectId(cursor)) throw httpError(400, 'Invalid cursor');
      query._id = { $lt: cursor };
    }

    const messages = await Message.find(query)
      .sort({ _id: -1 })
      .limit(limit)
      .populate('sender', SENDER_FIELDS)
      .lean();

    await Promise.all([
      Conversation.updateOne({ _id: conversationId }, { $set: { [`unreadCounts.${req.user._id}`]: 0 } }),
      Message.updateMany(
        { conversation: conversationId, sender: { $ne: req.user._id }, isRead: false },
        { isRead: true }
      ),
    ]);

    return successResponse(res, 200, 'Messages fetched', {
      messages: messages.reverse(),
      nextCursor: messages.length === limit ? messages[0]._id : null,
    });
  } catch (error) {
    return next(error);
  }
};

// @desc    Send a message
// @route   POST /api/messages
// @access  Private
const sendMessage = async (req, res, next) => {
  try {
    const senderId = req.user._id;
    const content = asTrimmed(req.body.content);
    if (!content) throw httpError(400, 'Message cannot be empty.');
    if (content.length > 2000) throw httpError(400, 'Messages are limited to 2000 characters.');

    const recipient = await findRecipient(asString(req.body.recipientId), senderId);

    let conversation = await Conversation.findOne({ participants: { $all: [senderId, recipient._id] } });
    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, recipient._id],
        unreadCounts: { [senderId]: 0, [recipient._id]: 0 },
      });
    }

    const message = await Message.create({
      conversation: conversation._id,
      sender: senderId,
      content,
      type: 'text',
    });

    await Conversation.updateOne(
      { _id: conversation._id },
      {
        $set: { lastMessage: message._id, lastActivity: new Date() },
        $inc: { [`unreadCounts.${recipient._id}`]: 1 },
      }
    );

    const populated = await Message.findById(message._id).populate('sender', SENDER_FIELDS).lean();

    // Deliver to both participants' private rooms: the recipient sees it even
    // when the conversation is not open, and the sender's other tabs stay in sync.
    emitToUser(recipient._id.toString(), 'new_message', populated);
    emitToUser(senderId.toString(), 'new_message', populated);

    return successResponse(res, 201, 'Message sent', populated);
  } catch (error) {
    return next(error);
  }
};

// @desc    Get or create a conversation with a user
// @route   POST /api/messages/conversations
// @access  Private
const getOrCreateConversation = async (req, res, next) => {
  try {
    const recipient = await findRecipient(asString(req.body.userId), req.user._id);

    let conversation = await Conversation.findOne({ participants: { $all: [req.user._id, recipient._id] } });
    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user._id, recipient._id],
        unreadCounts: { [req.user._id]: 0, [recipient._id]: 0 },
      });
    }

    const populated = await Conversation.findById(conversation._id)
      .populate('participants', PARTICIPANT_FIELDS)
      .populate('lastMessage', 'content sender createdAt')
      .lean();

    return successResponse(res, 200, 'Conversation fetched', serializeConversation(populated, req.user._id));
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getOrCreateConversation,
  getConversations,
  getMessages,
  sendMessage
};
