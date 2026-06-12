"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeTasksNamespace = void 0;
const logger_1 = require("../../config/logger");
const constants_1 = require("../../utils/constants");
const auth_1 = require("../auth");
const task_socket_1 = require("../task.socket");
const initializeTasksNamespace = (io) => {
    const namespace = io.of('/tasks');
    namespace.on('connection', (socket) => {
        logger_1.logger.info('Socket connected to /tasks namespace', { socketId: socket.id });
        const user = (0, auth_1.parseSocketUser)(socket);
        if (!user) {
            logger_1.logger.warn('/tasks connection rejected: invalid or missing auth token', {
                socketId: socket.id,
            });
            socket.emit(constants_1.SOCKET_EVENTS.connection.error, { message: 'Authentication required' });
            socket.disconnect(true);
            return;
        }
        socket.user = user;
        (0, task_socket_1.registerTaskSocket)(namespace, socket);
        socket.on('disconnect', (reason) => {
            logger_1.logger.info('Socket disconnected from /tasks namespace', {
                socketId: socket.id,
                reason,
            });
        });
    });
};
exports.initializeTasksNamespace = initializeTasksNamespace;
//# sourceMappingURL=tasks.namespace.js.map