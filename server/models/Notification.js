const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      'like', 
      'comment', 
      'reply', 
      'follow', 
      'mention', 
      'debateInvite', 
      'debateEnding', 
      'debateFinished', 
      'aiAnalysisComplete', 
      'voted'
    ],
    required: true
  },
  entity: {
    type: mongoose.Schema.Types.ObjectId,
    required: true // Refers to the Talk, Debate, Comment, etc.
  },
  entityModel: {
    type: String,
    enum: ['Talk', 'Debate', 'Comment', 'DebateComment', 'User'],
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  message: {
    type: String // Optional custom message for system notifications
  }
}, { timestamps: true });

// Index for getting user's unread notifications quickly
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
