"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationRouter = void 0;
const express_1 = require("express");
const asyncHandler_1 = require("../../utils/asyncHandler");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const validate_middleware_1 = require("../../middleware/validate.middleware");
const notification_controller_1 = require("./notification.controller");
const notification_validation_1 = require("./notification.validation");
exports.notificationRouter = (0, express_1.Router)();
exports.notificationRouter.use(auth_middleware_1.authMiddleware);
exports.notificationRouter.get('/', (0, validate_middleware_1.validateMiddleware)(notification_validation_1.listNotificationsQuerySchema), (0, asyncHandler_1.asyncHandler)(notification_controller_1.notificationController.list));
exports.notificationRouter.get('/unread-count', (0, validate_middleware_1.validateMiddleware)(notification_validation_1.countUnreadQuerySchema), (0, asyncHandler_1.asyncHandler)(notification_controller_1.notificationController.countUnread));
exports.notificationRouter.get('/:id', (0, validate_middleware_1.validateMiddleware)(notification_validation_1.notificationIdParamSchema), (0, asyncHandler_1.asyncHandler)(notification_controller_1.notificationController.getById));
exports.notificationRouter.post('/', (0, validate_middleware_1.validateMiddleware)(notification_validation_1.createNotificationSchema), (0, asyncHandler_1.asyncHandler)(notification_controller_1.notificationController.create));
exports.notificationRouter.patch('/:id/read', (0, validate_middleware_1.validateMiddleware)(notification_validation_1.markAsReadSchema), (0, asyncHandler_1.asyncHandler)(notification_controller_1.notificationController.markAsRead));
exports.notificationRouter.patch('/read-all', (0, validate_middleware_1.validateMiddleware)(notification_validation_1.markAllAsReadSchema), (0, asyncHandler_1.asyncHandler)(notification_controller_1.notificationController.markAllAsRead));
exports.notificationRouter.delete('/:id', (0, validate_middleware_1.validateMiddleware)(notification_validation_1.notificationIdParamSchema), (0, asyncHandler_1.asyncHandler)(notification_controller_1.notificationController.remove));
//# sourceMappingURL=notification.routes.js.map