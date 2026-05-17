import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import MessageRead from '../models/MessageRead.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';

function normalizeParticipants(participants) {
  const ids = (participants || []).map((p) => String(p));
  ids.sort();
  return ids;
}

function otherParticipant(conversation, myId) {
  const pid = String(myId);
  const other = (conversation.participants || []).find((p) => String(p._id || p) !== pid);
  return other;
}

export async function getConversations(req, res, next) {
  try {
    const userId = req.user.id;

    const conversations = await Conversation.find({
      participants: userId,
      isActive: true,
    })
      .populate('participants', '-password -__v')
      .sort({ lastMessageAt: -1, createdAt: -1 })
      .limit(50);

    // unread counts: count unread messages by checking MessageRead
    // Efficient approach for now: fetch last message and compute unread count for the conversation.
    // (Can be optimized later with conversation-level counters.)
    const results = [];
    for (const conv of conversations) {
      const lastMessage = conv.lastMessageId
        ? await Message.findById(conv.lastMessageId).populate('authorId', 'username displayName avatar')
        : null;

      let unreadCount = 0;
      if (lastMessage) {
        const read = await MessageRead.findOne({ messageId: lastMessage._id, userId });
        unreadCount = read ? 0 : String(lastMessage.authorId._id) !== String(userId) ? 1 : 0;
      }

      results.push({
        ...conv.toObject(),
        lastMessage: lastMessage
          ? {
              _id: lastMessage._id,
              text: lastMessage.text,
              sender: lastMessage.authorId,
              createdAt: lastMessage.createdAt,
            }
          : null,
        unreadCount,
      });
    }

    res.json(results);
  } catch (err) {
    console.error('[chatController.getConversations] error:', err);
    next(err);
  }
}

export async function getConversationMessages(req, res, next) {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
      isActive: true,
    });

    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

    const messages = await Message.find({
      conversationId,
      isDeleted: false,
    })
      .populate('authorId', 'username displayName avatar')
      .sort({ createdAt: 1 })
      .limit(500);

    // shape for frontend Messages.jsx
    const shaped = messages.map((m) => ({
      _id: m._id,
      conversationId: m.conversationId,
      text: m.text,
      sender: m.authorId,
      createdAt: m.createdAt,
      likes: [],
      attachments: m.attachments || [],
    }));

    res.json(shaped);
  } catch (err) {
    console.error('[chatController.getConversationMessages] error:', err);
    next(err);
  }
}

export async function createOrSendMessage(req, res, next) {
  try {
    const userId = req.user.id;
    const { conversationId, recipientId, text = '', media = [] } = req.body || {};

    if (!text || !String(text).trim()) {
      return res.status(400).json({ message: 'text required' });
    }

    let conv;
    if (conversationId) {
      conv = await Conversation.findOne({
        _id: conversationId,
        participants: userId,
        isActive: true,
      });
      if (!conv) return res.status(404).json({ message: 'Conversation not found' });
    } else {
      if (!recipientId) return res.status(400).json({ message: 'recipientId required' });

      // find or create DM conversation for pair
      const participants = normalizeParticipants([userId, recipientId]);
      conv = await Conversation.findOne({
        participants: { $all: participants, $size: participants.length },
        isActive: true,
      }).populate('participants', '-password -__v');

      if (!conv) {
        conv = await Conversation.create({
          participants,
          isActive: true,
        });
        await conv.populate('participants', '-password -__v');
      }
    }

    const sender = await User.findById(userId);

    const attachments = Array.isArray(media)
      ? media.map((a) => ({
          type: a.type || 'file',
          url: a.url || '',
          mimeType: a.mimeType || '',
          fileName: a.fileName || '',
          isReady: Boolean(a.isReady),
        }))
      : [];

    const message = await Message.create({
      conversationId: conv._id,
      authorId: userId,
      text: String(text).trim(),
      attachments,
    });

    // update conversation preview
    conv.lastMessageId = message._id;
    conv.lastMessagePreview = message.text?.slice(0, 200) || '';
    conv.lastMessageAt = message.createdAt;
    await conv.save();

    // mark sender as read immediately
    await MessageRead.create({ messageId: message._id, userId });

    // create notification for the other participants (DM)
    const recipientIds = conv.participants.map((p) => String(p._id || p)).filter((id) => id !== String(userId));

    const notifDocs = recipientIds.map((rid) => Notification.create({
      userId: rid,
      type: 'message',
      actorId: userId,
      referenced: {
        conversationId: conv._id,
        messageId: message._id,
        targetId: rid,
      },
      payload: {
        title: 'New message',
        body: `${sender?.username || 'Someone'}: ${message.text}`,
        extra: {},
      },
    }));

    await Promise.all(notifDocs);

    // socket event is emitted by socket handler in realtime layer;
    // REST just returns payload.

    const shaped = {
      _id: message._id,
      conversationId: conv._id,
      text: message.text,
      sender: {
        _id: sender?._id,
        username: sender?.username,
        displayName: sender?.displayName,
        avatar: sender?.avatar,
      },
      createdAt: message.createdAt,
      likes: [],
      attachments,
    };

    res.status(201).json({
      conversation: conv,
      message: shaped,
    });
  } catch (err) {
    console.error('[chatController.createOrSendMessage] error:', err);
    next(err);
  }
}

export async function markConversationRead(req, res, next) {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;

    const conversation = await Conversation.findOne({ _id: conversationId, participants: userId, isActive: true });
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

    const messages = await Message.find({ conversationId, isDeleted: false }).select('_id');

    const readBulk = messages.map((m) => ({ messageId: m._id, userId }));

    // upsert receipts
    await Promise.all(
      readBulk.map((r) => MessageRead.updateOne({ messageId: r.messageId, userId }, { $setOnInsert: { readAt: new Date() } }, { upsert: true }))
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('[chatController.markConversationRead] error:', err);
    next(err);
  }
}

export async function getUserNotifications(req, res, next) {
  try {
    const userId = req.user.id;
    const notifs = await Notification.find({ userId, isActive: true })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(
      notifs.map((n) => ({
        _id: n._id,
        type: n.type,
        actor: n.actorId,
        text: n.payload?.body,
        read: n.isRead || Boolean(n.readAt),
        createdAt: n.createdAt,
        referenced: n.referenced,
      }))
    );
  } catch (err) {
    console.error('[chatController.getUserNotifications] error:', err);
    next(err);
  }
}

export async function markNotificationRead(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await Notification.updateOne({ _id: id, userId }, { $set: { isRead: true, readAt: new Date() } });
    res.json({ ok: true });
  } catch (err) {
    console.error('[chatController.markNotificationRead] error:', err);
    next(err);
  }
}

