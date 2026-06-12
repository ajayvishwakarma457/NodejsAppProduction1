"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSockets = void 0;
const logger_1 = require("../config/logger");
const constants_1 = require("../utils/constants");
const auth_1 = require("./auth");
const notification_socket_1 = require("./notification.socket");
const task_socket_1 = require("./task.socket");
const team_socket_1 = require("./team.socket");
const registerSockets = (io) => {
    io.on('connection', (socket) => {
        try {
            logger_1.logger.info('Socket connected', {
                socketId: socket.id,
                ip: socket.handshake.address,
            });
            const user = (0, auth_1.parseSocketUser)(socket);
            if (!user) {
                logger_1.logger.warn('Socket connection rejected: invalid or missing auth token', {
                    socketId: socket.id,
                });
                socket.emit(constants_1.SOCKET_EVENTS.connection.error, { message: 'Authentication required' });
                socket.disconnect(true);
                return;
            }
            socket.user = user;
            // Join a per-user notification room on the default namespace so push
            // notifications can be delivered over the existing socket connection.
            socket.join(`${constants_1.SOCKET_ROOM_PREFIX.notification}${user.id}`);
            (0, task_socket_1.registerTaskSocket)(io, socket);
            (0, notification_socket_1.registerNotificationSocket)(socket);
            (0, team_socket_1.registerTeamSocket)(io, socket);
            socket.on('disconnect', (reason) => {
                logger_1.logger.info('Socket disconnected', {
                    socketId: socket.id,
                    reason,
                });
            });
            socket.on('error', (err) => {
                logger_1.logger.error('Socket error', {
                    socketId: socket.id,
                    error: err instanceof Error ? err.message : String(err),
                });
            });
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            logger_1.logger.error('Unhandled error in socket connection handler', {
                socketId: socket.id,
                error: error.message,
            });
            socket.disconnect(true);
        }
    });
};
exports.registerSockets = registerSockets;
//# sourceMappingURL=index.js.map