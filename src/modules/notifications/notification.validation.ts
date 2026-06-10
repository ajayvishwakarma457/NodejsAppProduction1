import { z } from 'zod';
import { NOTIFICATION_CHANNELS, NOTIFICATION_TYPES } from './notification.model';

/* ------------------------------------------------------------------ */
// Body schemas
/* ------------------------------------------------------------------ */

export const createNotificationSchema = z.object({
  body: z.object({
    userId: z.string().min(1, 'User id is required'),
    title: z.string().min(1, 'Title is required').max(200),
    message: z.string().min(1, 'Message is required').max(2000),
    type: z.enum(NOTIFICATION_TYPES, { message: 'Invalid notification type' }),
    channels: z
      .array(z.enum(NOTIFICATION_CHANNELS, { message: 'Invalid notification channel' }))
      .optional()
      .default(['in-app']),
    scheduledAt: z.string().datetime().optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
});

/* ------------------------------------------------------------------ */
// Query / route param schemas
/* ------------------------------------------------------------------ */

export const listNotificationsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(10),
    sort: z.string().optional().default('createdAt'),
    order: z.enum(['asc', 'desc']).optional().default('desc'),
    isRead: z
      .enum(['true', 'false'])
      .optional()
      .transform((v) => v === 'true'),
    type: z.enum(NOTIFICATION_TYPES).optional(),
  }),
});

export const notificationIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Notification id is required'),
  }),
});

export const markAsReadSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Notification id is required'),
  }),
});
