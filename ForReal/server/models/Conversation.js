import mongoose from 'mongoose';
const { Schema, Types } = mongoose;

const ConversationSchema = new Schema(
  {
    participants: [
      {
        type: Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    // For future: allow group chats; currently messages are delivered to all participants.
    isActive: { type: Boolean, default: true },
    lastMessageId: { type: Types.ObjectId, ref: 'Message' },
    lastMessagePreview: {
      type: String,
      default: '',
      maxlength: 500,
    },
    lastMessageAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Conversation is uniquely determined by participants set in most DM scenarios.
// This keeps it scalable and lets the REST create endpoint upsert.
ConversationSchema.index({ participants: 1 });

ConversationSchema.pre('save', function preSave(next) {
  if (this.isModified('participants') && Array.isArray(this.participants)) {
    // ensure deterministic ordering so unique-set comparisons work
    const ids = this.participants.map((p) => String(p));
    ids.sort();
    this.participants = ids;
  }
  next();
});

export default mongoose.model('Conversation', ConversationSchema);

