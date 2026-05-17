import mongoose from 'mongoose';
const { Schema, Types } = mongoose;

// Read receipts per message.
// For scale we keep 1 document per (messageId, userId).
const MessageReadSchema = new Schema(
  {
    messageId: { type: Types.ObjectId, ref: 'Message', required: true, index: true },
    userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    readAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

MessageReadSchema.index({ messageId: 1, userId: 1 }, { unique: true });

export default mongoose.model('MessageRead', MessageReadSchema);

