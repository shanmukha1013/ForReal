const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const { successResponse } = require('../utils/apiResponse');

// @desc    Get all conversations for a user
// @route   GET /api/messages/conversations
// @access  Private
const getConversations = async (req, res, next) => {
  try {
    const conversations = await Conversation.find({ participants: req.user.id })
      .populate('participants', 'username profile avatar isOnline lastSeen')
      .populate('lastMessage')
      .sort({ lastActivity: -1 });

    return successResponse(res, 200, 'Conversations fetched', conversations);
  } catch (error) {
    next(error);
  }
};

// @desc    Get messages for a conversation
// @route   GET /api/messages/:conversationId
// @access  Private
const getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const limit = parseInt(req.query.limit, 10) || 50;
    const cursor = req.query.cursor; // Last message ID seen

    // Verify user is part of conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.participants.includes(req.user.id)) {
      res.status(403);
      throw new Error('Not authorized to view these messages');
    }

    let query = { conversation: conversationId };
    if (cursor) {
      query._id = { $lt: cursor };
    }

    const messages = await Message.find(query)
      .sort({ _id: -1 }) // Newest first
      .limit(limit)
      .populate('sender', 'username profile avatar');

    // Reset unread count for this user
    conversation.unreadCounts.set(req.user.id.toString(), 0);
    await conversation.save();

    return successResponse(res, 200, 'Messages fetched', {
      messages: messages.reverse(), // Send in chronological order
      nextCursor: messages.length === limit ? messages[messages.length - 1]._id : null
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send a message
// @route   POST /api/messages
// @access  Private
const sendMessage = async (req, res, next) => {
  try {
    const { recipientId, content, type } = req.body;

    // Check if conversation exists
    let conversation = await Conversation.findOne({
      participants: { $all: [req.user.id, recipientId] }
    });

    if (!conversation) {
      // Check privacy settings of recipient
      const recipient = await User.findById(recipientId);
      // Logic for privacy omitted for brevity, assuming allowed
      
      conversation = await Conversation.create({
        participants: [req.user.id, recipientId],
        unreadCounts: { [req.user.id]: 0, [recipientId]: 0 }
      });
    }

    const message = await Message.create({
      conversation: conversation._id,
      sender: req.user.id,
      content,
      type: type || 'text'
    });

    // Update conversation
    conversation.lastMessage = message._id;
    conversation.lastActivity = Date.now();
    
    // Increment unread count for recipient
    const currentUnread = conversation.unreadCounts.get(recipientId.toString()) || 0;
    conversation.unreadCounts.set(recipientId.toString(), currentUnread + 1);
    
    await conversation.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'username profile avatar');

    const io = require('../sockets').getIo();
    io.to(`conv_${conversation._id}`).emit('new_message', populatedMessage);

    return successResponse(res, 201, 'Message sent', populatedMessage);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getConversations,
  getMessages,
  sendMessage
};
