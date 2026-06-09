import { InferSchemaType, Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    avatar: { type: String },
    role: {
      type: String,
      enum: ["admin", "manager", "member"],
      default: "member"
    },
    isVerified: { type: Boolean, default: false },
    refreshToken: { type: String },
    lastLogin: { type: Date }
  },
  {
    timestamps: true
  }
);

export type UserDocument = InferSchemaType<typeof userSchema>;

export const UserModel = model<UserDocument>("User", userSchema);
