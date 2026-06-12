"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeNotificationsNamespace = void 0;
const logger_1 = require("../../config/logger");
const constants_1 = require("../../utils/constants");
const auth_1 = require("../auth");
const notification_socket_1 = require("../notification.socket");
const initializeNotificationsNamespace = (io) => {
    const namespace = io.of('/notifications');
    namespace.on('connection', (socket) => {
        logger_1.logger.info('Socket connected to /notifications namespace', { socketId: socket.id });
        const user = (0, auth_1.parseSocketUser)(socket);
        if (!user) {
            logger_1.logger.warn('/notifications connection rejected: invalid or missing auth token', {
                socketId: socket.id,
            });
            socket.emit(constants_1.SOCKET_EVENTS.connection.error, { message: 'Authentication required' });
            socket.disconnect(true);
            return;
        }
        socket.user = user;
        // Join a per-user room so the server can push notifications to this user.
        const room = `${constants_1.SOCKET_ROOM_PREFIX.notification}${user.id}`;
        socket.join(room);
        (0, notification_socket_1.registerNotificationSocket)(socket);
        socket.on('disconnect', (reason) => {
            logger_1.logger.info('Socket disconnected from /notifications namespace', {
                socketId: socket.id,
                reason,
            });
        });
    });
};
exports.initializeNotificationsNamespace = initializeNotificationsNamespace;
//# sourceMappingURL=notifications.namespace.js.map