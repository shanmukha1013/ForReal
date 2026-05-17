import mongoose from 'mongoose';

const { Schema, Types } = mongoose;

/**
 * Media Schema - Embedded document for post media
 */
const MediaSchema = new Schema(
  {
    url: { type: String, required: true },
    type: { type: String, enum: ['image', 'video', 'gif'], default: 'image' },
    alt: { type: String, default: '' },
    width: { type: Number },
    height: { type: Number },
  },
  { _id: false }
);

/**
 * Reaction Schema - Embedded document for reaction tracking
 */
const ReactionSchema = new Schema(
  {
    likes: [{ type: Types.ObjectId, ref: 'User' }],
    dislikes: [{ type: Types.ObjectId, ref: 'User' }],
    agrees: [{ type: Types.ObjectId, ref: 'User' }],
    disagrees: [{ type: Types.ObjectId, ref: 'User' }],
    facts: [{ type: Types.ObjectId, ref: 'User' }],
    caps: [{ type: Types.ObjectId, ref: 'User' }],
    misleadings: [{ type: Types.ObjectId, ref: 'User' }],
    validPoints: [{ type: Types.ObjectId, ref: 'User' }],
  },
  { _id: false }
);

/**
 * Metadata Schema - Embedded document for post metadata
 */
const MetadataSchema = new Schema(
  {
    credibilityScore: { type: Number, default: 0, min: 0, max: 100 },
    tags: [{ type: String, trim: true }],
    sourceUrl: { type: String, default: '' },
    verified: { type: Boolean, default: false },
  },
  { _id: false }
);

/**
 * Post Schema - Professional-grade schema for social media workloads
 */
const PostSchema = new Schema(
  {
    // Identity
    author: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Content
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 280,
    },
    media: [MediaSchema],
    metadata: { type: MetadataSchema, default: () => ({}) },

    // Engagement - Using embedded reactions for performance
    reactions: { type: ReactionSchema, default: () => ({}) },
    commentsCount: { type: Number, default: 0, min: 0 },
    likesCount: { type: Number, default: 0, min: 0 },
    dislikesCount: { type: Number, default: 0, min: 0 },

    // Status
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

// ============================================================================
// Indexes for Query Performance
// ============================================================================

// Compound index for feed queries: author + createdAt (newest first)
PostSchema.index({ author: 1, createdAt: -1 });

// Index for sorting by createdAt (main feed)
PostSchema.index({ createdAt: -1 });

// Index for finding posts by author with pagination
PostSchema.index({ author: 1, createdAt: -1 });

// Sparse index for non-deleted posts
PostSchema.index({ isDeleted: 1, createdAt: -1 });

// TTL index for soft-deleted posts (optional cleanup after 30 days)
PostSchema.index({ deletedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// Text index for search functionality
PostSchema.index({ text: 'text', 'metadata.tags': 'text' });

// ============================================================================
// Virtuals
// ============================================================================

// Total engagement count
PostSchema.virtual('engagementCount').get(function () {
  return (this.likesCount || 0) + (this.dislikesCount || 0) + (this.commentsCount || 0);
});

// ============================================================================
// Methods
// ============================================================================

// Check if user has reacted with a specific reaction type
PostSchema.methods.hasReacted = function (userId, reactionType) {
  const reactions = this.reactions || {};
  const reactionArray = reactions[reactionType] || [];
  return reactionArray.some((id) => String(id) === String(userId));
};

// Toggle user reaction
PostSchema.methods.toggleReaction = function (userId, reactionType) {
  const reactions = this.reactions || {};
  const reactionArray = reactions[reactionType] || [];
  const userIndex = reactionArray.findIndex((id) => String(id) === String(userId));

  if (userIndex === -1) {
    // Add reaction
    reactionArray.push(userId);
  } else {
    // Remove reaction
    reactionArray.splice(userIndex, 1);
  }

  reactions[reactionType] = reactionArray;
  this.reactions = reactions;

  // Update counts
  this.likesCount = (reactions.likes || []).length;
  this.dislikesCount = (reactions.dislikes || []).length;

  return this;
};

// Remove user from all reactions
PostSchema.methods.clearUserReactions = function (userId) {
  const reactionTypes = ['likes', 'dislikes', 'agrees', 'disagrees', 'facts', 'caps', 'misleadings', 'validPoints'];

  reactionTypes.forEach((type) => {
    if (this.reactions[type]) {
      this.reactions[type] = this.reactions[type].filter((id) => String(id) !== String(userId));
    }
  });

  this.likesCount = (this.reactions.likes || []).length;
  this.dislikesCount = (this.reactions.dislikes || []).length;

  return this;
};

// ============================================================================
// Statics
// ============================================================================

// Build feed query with proper indexing
PostSchema.statics.buildFeedQuery = function (options = {}) {
  const query = this.find({ isDeleted: { $ne: true } });

  // Apply pagination
  if (options.before) {
    query.where({ createdAt: { $lt: options.before } });
  }

  return query;
};

// ============================================================================
// Middleware
// ============================================================================

// Update counts before save if reactions were modified
PostSchema.pre('save', function () {
  const reactions = this.reactions || {};
  this.likesCount = (reactions.likes || []).length;
  this.dislikesCount = (reactions.dislikes || []).length;
});

// Transform output to remove sensitive/internal fields
PostSchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.__v;
    delete ret.isDeleted;
    return ret;
  },
});

const Post = mongoose.model('Post', PostSchema);

export default Post;
