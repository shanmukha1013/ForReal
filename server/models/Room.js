import mongoose from 'mongoose';
const { Schema, Types } = mongoose;

/**
 * Room Schema - For debate rooms
 */
const RoomSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      maxlength: 500,
    },
    createdBy: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
    },
    participants: [{
      type: Types.ObjectId,
      ref: 'User',
    }],
    isActive: {
      type: Boolean,
      default: true,
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    category: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    maxParticipants: {
      type: Number,
      default: 50,
    },
    participantCount: {
      type: Number,
      default: 0,
    },
    startTime: {
      type: Date,
    },
    endTime: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
RoomSchema.index({ createdBy: 1, createdAt: -1 });
RoomSchema.index({ isActive: 1, createdAt: -1 });
RoomSchema.index({ participants: 1 });

const Room = mongoose.model('Room', RoomSchema);

export default Room;
