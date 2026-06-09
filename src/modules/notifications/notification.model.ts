import { InferSchemaType, Schema, model } from "mongoose";

export const NOTIFICATION_TYPES = [
  "task-assigned",
  "task-updated",
  "comment-added",
  "project-created",
  "mention",
  "due-soon",
  "invite"
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_CHANNELS = ["in-app", "email", "socket"] as const;

export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

const notificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true
    },
    channels: {
      type: [String],
      enum: NOTIFICATION_CHANNELS,
      default: ["in-app"]
    },
    isRead: { type: Boolean, default: false, index: true },
    status: {
      type: String,
      enum: ["pending", "delivered", "failed"],
      default: "pending"
    },
    scheduledAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
    errorMessage: { type: String, default: null }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

notificationSchema.index({ createdAt: 1 });
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export type NotificationDocument = InferSchemaType<typeof notificationSchema>;

export const NotificationModel = model<NotificationDocument>("Notification", notificationSchema);
