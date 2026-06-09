"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerNotificationSocket = void 0;
const logger_1 = require("../config/logger");
const notification_service_1 = require("../modules/notifications/notification.service");
const constants_1 = require("../utils/constants");
const helpers_1 = require("../utils/helpers");
const socketHandler_1 = require("../utils/socketHandler");
const registerNotificationSocket = (socket) => {
    (0, socketHandler_1.socketHandler)(socket, constants_1.SOCKET_EVENTS.notification.read, async (notificationId) => {
        if (!(0, helpers_1.isValidId)(notificationId)) {
            logger_1.logger.warn("Invalid notification:read payload", { socketId: socket.id, notificationId });
            socket.emit(constants_1.SOCKET_EVENTS.notification.error, { message: "Invalid notificationId" });
            return;
        }
        const userId = socket.user?.id;
        if (!userId) {
            logger_1.logger.warn("notification:read rejected: missing user context", { socketId: socket.id });
            socket.emit(constants_1.SOCKET_EVENTS.notification.error, { message: "Unauthorized" });
            return;
        }
        const updated = await notification_service_1.notificationService.markAsRead(notificationId, userId);
        if (!updated) {
            logger_1.logger.warn("notification:read rejected: not found or already read", {
                socketId: socket.id,
                notificationId,
                userId
            });
            socket.emit(constants_1.SOCKET_EVENTS.notification.error, { message: "Notification not found or already read" });
            return;
        }
        socket.emit(constants_1.SOCKET_EVENTS.notification.ack, { notificationId });
        logger_1.logger.info(`Notification ${notificationId} marked as read by user ${userId}`);
    });
};
exports.registerNotificationSocket = registerNotificationSocket;
