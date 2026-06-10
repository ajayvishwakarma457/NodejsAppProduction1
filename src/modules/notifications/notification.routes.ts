import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validateMiddleware } from '../../middleware/validate.middleware';
import { notificationController } from './notification.controller';
import {
  createNotificationSchema,
  listNotificationsQuerySchema,
  markAsReadSchema,
  notificationIdParamSchema,
} from './notification.validation';

export const notificationRouter = Router();

notificationRouter.use(authMiddleware);

notificationRouter.get(
  '/',
  validateMiddleware(listNotificationsQuerySchema),
  asyncHandler(notificationController.list)
);

notificationRouter.get('/unread-count', asyncHandler(notificationController.countUnread));

notificationRouter.get(
  '/:id',
  validateMiddleware(notificationIdParamSchema),
  asyncHandler(notificationController.getById)
);

notificationRouter.post(
  '/',
  validateMiddleware(createNotificationSchema),
  asyncHandler(notificationController.create)
);

notificationRouter.patch(
  '/:id/read',
  validateMiddleware(markAsReadSchema),
  asyncHandler(notificationController.markAsRead)
);

notificationRouter.patch('/read-all', asyncHandler(notificationController.markAllAsRead));

notificationRouter.delete(
  '/:id',
  validateMiddleware(notificationIdParamSchema),
  asyncHandler(notificationController.remove)
);
