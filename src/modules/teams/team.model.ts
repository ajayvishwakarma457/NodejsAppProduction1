import { InferSchemaType, Schema, model } from 'mongoose';

/* ------------------------------------------------------------------ */
// Subdocument Schema
/* ------------------------------------------------------------------ */

const teamMemberSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Member userId is required'],
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member'],
      default: 'member',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

/* ------------------------------------------------------------------ */
// Main Schema
/* ------------------------------------------------------------------ */

const teamSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Team name is required'],
      trim: true,
      maxlength: [100, 'Team name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Team description is required'],
      trim: true,
      maxlength: [500, 'Team description cannot exceed 500 characters'],
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Team owner is required'],
    },
    members: {
      type: [teamMemberSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.__v;
        ret.id = ret._id;
        delete ret._id;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

/* ------------------------------------------------------------------ */
// Indexes
/* ------------------------------------------------------------------ */

// Index for looking up teams by owner.
teamSchema.index({ ownerId: 1 }, { name: 'owner_idx' });

// Index for looking up teams a user belongs to (as a member).
teamSchema.index({ 'members.userId': 1 }, { name: 'members_userid_idx' });

// Compound index for default list ordering.
teamSchema.index({ createdAt: -1 }, { name: 'createdat_desc_idx' });

/* ------------------------------------------------------------------ */
// Virtuals
/* ------------------------------------------------------------------ */

teamSchema.virtual('memberCount').get(function () {
  return this.members?.length ?? 0;
});

/* ------------------------------------------------------------------ */
// Export
/* ------------------------------------------------------------------ */

export type TeamDocument = InferSchemaType<typeof teamSchema>;

export const TeamModel = model('Team', teamSchema);
