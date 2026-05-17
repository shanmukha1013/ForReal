import mongoose from 'mongoose';
const { Schema, Types } = mongoose;

const MessageSchema = new Schema(
  {
    conversationId: {
      type: Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    authorId: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Text
    text: {
      type: String,
      default: '',
      trim: true,
      maxlength: 5000,
    },

    // Attachments/media readiness (server-side readiness flag)
    attachments: [
      {
        type: {
          type: String,
          enum: ['image', 'video', 'file', 'link'],
          default: 'file',
        },
        url: { type: String, default: '' },
        mimeType: { type: String, default: '' },
        fileName: { type: String, default: '' },
        isReady: { type: Boolean, default: false },
      },
    ],

    // Delivery/read status primitives
    // (read state is tracked in MessageRead; this is kept for event payloads)
    isDeleted: { type: Boolean, default: false },

    // Helpful denormalized field for quick conversation preview
    createdAt: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
  }
);

MessageSchema.index({ conversationId: 1, createdAt: 1 });

export default mongoose.model('Message', MessageSchema);

