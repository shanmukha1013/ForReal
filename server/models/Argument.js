import mongoose from 'mongoose';

const { Schema, Types } = mongoose;

/**
 * Evidence Schema - Attached evidence to support the argument
 */
const EvidenceSchema = new Schema(
  {
    url: { type: String, required: true },
    type: { type: String, enum: ['website', 'pdf', 'image', 'video'], default: 'website' },
    title: { type: String },
    verificationStatus: { type: String, enum: ['Verified', 'Pending', 'Questionable'], default: 'Pending' }
  },
  { _id: true }
);

/**
 * Community Note Schema - Context added by the community
 */
const CommunityNoteSchema = new Schema(
  {
    author: { type: Types.ObjectId, ref: 'User' },
    text: { type: String, required: true },
    sourceUrl: { type: String },
    helpfulCount: { type: Number, default: 0 },
    notHelpfulCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

/**
 * AI Analysis Schema - Continuous AI scoring
 */
const AIAnalysisSchema = new Schema(
  {
    factCheckStatus: { 
      type: String, 
      enum: ['Supported', 'Opinion', 'False Claim', 'Misleading', 'Unverified'],
      default: 'Unverified'
    },
    confidenceScore: { type: Number, default: 0 },
    logicScore: { type: Number, default: 0 },
    evidenceScore: { type: Number, default: 0 },
    clarityScore: { type: Number, default: 0 },
    biasScore: { type: Number, default: 0 },
    overallQuality: { type: Number, default: 0 },
    explanation: { type: String }
  },
  { _id: false }
);

const ReactionSchema = new Schema(
  {
    likes: [{ type: Types.ObjectId, ref: 'User' }],
    dislikes: [{ type: Types.ObjectId, ref: 'User' }]
  },
  { _id: false }
);

/**
 * Argument Schema - Replaces Post.js for structured debates
 */
const ArgumentSchema = new Schema(
  {
    author: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    room: { type: Types.ObjectId, ref: 'Room', required: true, index: true },
    optionName: { type: String, required: true }, // Which side/option they are arguing for
    text: { type: String, required: true, trim: true, maxlength: 1000 },
    evidence: [EvidenceSchema],
    communityNotes: [CommunityNoteSchema],
    aiAnalysis: { type: AIAnalysisSchema, default: () => ({}) },
    reactions: { type: ReactionSchema, default: () => ({ likes: [], dislikes: [] }) },
    likesCount: { type: Number, default: 0 },
    dislikesCount: { type: Number, default: 0 },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

ArgumentSchema.index({ room: 1, createdAt: -1 });

ArgumentSchema.methods.toggleReaction = function (userId, reactionType) {
  const reactions = this.reactions || { likes: [], dislikes: [] };
  const reactionArray = reactions[reactionType] || [];
  const userIndex = reactionArray.findIndex((id) => String(id) === String(userId));

  if (userIndex === -1) {
    reactionArray.push(userId);
  } else {
    reactionArray.splice(userIndex, 1);
  }

  reactions[reactionType] = reactionArray;
  this.reactions = reactions;
  this.likesCount = (reactions.likes || []).length;
  this.dislikesCount = (reactions.dislikes || []).length;
  return this;
};

ArgumentSchema.pre('save', function () {
  const reactions = this.reactions || { likes: [], dislikes: [] };
  this.likesCount = (reactions.likes || []).length;
  this.dislikesCount = (reactions.dislikes || []).length;
});

const Argument = mongoose.model('Argument', ArgumentSchema);
export default Argument;
