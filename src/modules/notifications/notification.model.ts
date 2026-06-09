import { InferSchemaType, Schema, model } from "mongoose";

const notificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["task-assigned", "task-updated", "comment-added", "project-created"],
      required: true
    },
    isRead: { type: Boolean, default: false }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

export type NotificationDocument = InferSchemaType<typeof notificationSchema>;

export const NotificationModel = model<NotificationDocument>("Notification", notificationSchema);
