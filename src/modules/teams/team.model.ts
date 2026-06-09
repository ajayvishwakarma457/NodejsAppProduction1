import { InferSchemaType, Schema, model, Types } from "mongoose";

const teamMemberSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: {
      type: String,
      enum: ["owner", "admin", "member"],
      default: "member"
    },
    joinedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const teamSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    members: { type: [teamMemberSchema], default: [] }
  },
  {
    timestamps: true
  }
);

export type TeamDocument = InferSchemaType<typeof teamSchema>;

export const TeamModel = model<TeamDocument>("Team", teamSchema);
