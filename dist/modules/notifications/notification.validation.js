"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAllAsReadSchema = exports.dashboardNotificationsQuerySchema = exports.countUnreadQuerySchema = exports.markAsReadSchema = exports.notificationIdParamSchema = exports.listNotificationsQuerySchema = exports.createNotificationSchema = void 0;
const zod_1 = require("zod");
const notification_model_1 = require("./notification.model");
/* ------------------------------------------------------------------ */
// Body schemas
/* ------------------------------------------------------------------ */
exports.createNotificationSchema = zod_1.z.object({
    body: zod_1.z.object({
        userId: zod_1.z.string().min(1, 'User id is required'),
        title: zod_1.z.string().min(1, 'Title is required').max(200),
        message: zod_1.z.string().min(1, 'Message is required').max(2000),
        type: zod_1.z.enum(notification_model_1.NOTIFICATION_TYPES, { message: 'Invalid notification type' }),
        channels: zod_1.z
            .array(zod_1.z.enum(notification_model_1.NOTIFICATION_CHANNELS, { message: 'Invalid notification channel' }))
            .optional()
            .default(['in-app']),
        scheduledAt: zod_1.z.string().datetime().optional(),
        metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    }),
});
/* ------------------------------------------------------------------ */
// Query / route param schemas
/* ------------------------------------------------------------------ */
exports.listNotificationsQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.coerce.number().min(1).default(1),
        limit: zod_1.z.coerce.number().min(1).max(100).default(10),
        sort: zod_1.z.string().optional().default('createdAt'),
        order: zod_1.z.enum(['asc', 'desc']).optional().default('desc'),
        isRead: zod_1.z
            .enum(['true', 'false'])
            .optional()
            .transform((v) => v === 'true'),
        type: zod_1.z.enum(notification_model_1.NOTIFICATION_TYPES).optional(),
    }),
});
exports.notificationIdParamSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1, 'Notification id is required'),
    }),
});
exports.markAsReadSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1, 'Notification id is required'),
    }),
});
exports.countUnreadQuerySchema = zod_1.z.object({
    query: zod_1.z.object({}).optional(),
});
exports.dashboardNotificationsQuerySchema = zod_1.z.object({
    query: zod_1.z.object({}).optional(),
});
exports.markAllAsReadSchema = zod_1.z.object({
    body: zod_1.z.object({}).optional(),
});
//# sourceMappingURL=notification.validation.js.map