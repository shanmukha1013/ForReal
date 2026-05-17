import mongoose from 'mongoose';
const { Schema, Types } = mongoose;

const NotificationSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },

    type: {
      type: String,
      enum: [
        'message',
        'reaction',
        'reply',
        'mention',
        'follow',
        'room',
      ],
      required: true,
    },

    actorId: { type: Types.ObjectId, ref: 'User' },

    // referenced entities (message/conversation/room/etc.)
    referenced: {
      conversationId: { type: Types.ObjectId, ref: 'Conversation' },
      messageId: { type: Types.ObjectId, ref: 'Message' },
      roomId: { type: Types.ObjectId, ref: 'Room' },
      targetId: { type: Types.ObjectId },
    },

    // read/unread
    readAt: { type: Date },
    isRead: { type: Boolean, default: false },

    // store a small snapshot for UI rendering
    payload: {
      title: { type: String, default: '' },
      body: { type: String, default: '' },
      extra: { type: Schema.Types.Mixed, default: {} },
    },

    // soft deletes not necessary now, but kept for future
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export default mongoose.model('Notification', NotificationSchema);

