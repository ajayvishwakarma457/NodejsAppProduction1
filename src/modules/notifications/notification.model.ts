import { InferSchemaType, Schema, Types, model } from 'mongoose';

export const NOTIFICATION_TYPES = [
  'task-assigned',
  'task-updated',
  'comment-added',
  'project-created',
  'mention',
  'due-soon',
  'invite',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_CHANNELS = ['in-app', 'email', 'socket'] as const;

export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

const notificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true,
    },
    channels: {
      type: [String],
      validate: {
        validator: (v: string[]) =>
          v.every((c) => NOTIFICATION_CHANNELS.includes(c as NotificationChannel)),
        message: 'Invalid notification channel',
      },
      default: ['in-app'],
    },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ['pending', 'delivered', 'failed'],
      default: 'pending',
    },
    scheduledAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
    errorMessage: { type: String, default: null },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ createdAt: 1 }, { name: 'notification_createdat_asc_idx' });
notificationSchema.index(
  { userId: 1, isRead: 1, createdAt: -1 },
  { name: 'notification_user_read_createdat_idx' }
);
notificationSchema.index(
  { status: 1, scheduledAt: 1 },
  { name: 'notification_status_scheduledat_idx' }
);

// Text index for notification search.
notificationSchema.index(
  { title: 'text', message: 'text' },
  { name: 'notification_text_search_idx', weights: { title: 10, message: 5 } }
);

// Partial index for pending notifications ready to be delivered.
notificationSchema.index(
  { status: 1, scheduledAt: 1, createdAt: 1 },
  {
    name: 'pending_ready_idx',
    partialFilterExpression: { status: 'pending' },
  }
);

// Compound index for type-filtered user feeds.
notificationSchema.index(
  { userId: 1, type: 1, createdAt: -1 },
  { name: 'user_type_createdat_idx' }
);

export type NotificationDocument = InferSchemaType<typeof notificationSchema> & { _id: Types.ObjectId };

export const NotificationModel = model<NotificationDocument>('Notification', notificationSchema);
