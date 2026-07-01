import mongoose from 'mongoose';
const { Schema, Types } = mongoose;

const NotificationSchema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['follow', 'mention', 'like', 'comment', 'reply', 'quote', 'invite', 'debate_ending', 'debate_finished', 'ai_analysis', 'system'],
      required: true,
    },
    actorId: {
      type: Types.ObjectId,
      ref: 'User',
    },
    actorIds: [{
      type: Types.ObjectId,
      ref: 'User',
    }],
    groupId: {
      type: String, // e.g. "like_post_123" to group similar notifications
    },
    payload: {
      title: String,
      body: String,
      link: String,
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for getting user's latest notifications quickly
NotificationSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('Notification', NotificationSchema);
