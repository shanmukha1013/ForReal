import mongoose from 'mongoose';

const ConversationSchema = new mongoose.Schema(
  {
    participants: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }],
    lastMessage: {
      type: Object,
      default: null
    }
  },
  { timestamps: true }
);

const Conversation = mongoose.model('Conversation', ConversationSchema);
export default Conversation;