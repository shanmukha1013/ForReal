import mongoose from 'mongoose';
const { Schema, Types } = mongoose;

const FollowSchema = new Schema(
  {
    followerId: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    followingId: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true, // This gives us createdAt and updatedAt
  }
);

// A user can only follow another user once
FollowSchema.index({ followerId: 1, followingId: 1 }, { unique: true });
// Optimize for queries looking for who a user is following or who follows a user
FollowSchema.index({ followingId: 1, createdAt: -1 });
FollowSchema.index({ followerId: 1, createdAt: -1 });

export default mongoose.model('Follow', FollowSchema);
