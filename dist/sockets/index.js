"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSockets = void 0;
const logger_1 = require("../config/logger");
const constants_1 = require("../utils/constants");
const token_service_1 = require("../services/token.service");
const notification_socket_1 = require("./notification.socket");
const task_socket_1 = require("./task.socket");
const team_socket_1 = require("./team.socket");
const parseSocketUser = (socket) => {
    try {
        const token = socket.handshake.auth.token;
        if (!token)
            return null;
        const payload = token_service_1.tokenService.verifyAccessToken(token);
        return { id: payload.sub, email: payload.email, role: payload.role };
    }
    catch {
        return null;
    }
};
const registerSockets = (io) => {
    io.on('connection', (socket) => {
        try {
            logger_1.logger.info('Socket connected', {
                socketId: socket.id,
                ip: socket.handshake.address,
            });
            const user = parseSocketUser(socket);
            if (!user) {
                logger_1.logger.warn('Socket connection rejected: invalid or missing auth token', {
                    socketId: socket.id,
                });
                socket.emit(constants_1.SOCKET_EVENTS.connection.error, { message: 'Authentication required' });
                socket.disconnect(true);
                return;
            }
            socket.user = user;
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