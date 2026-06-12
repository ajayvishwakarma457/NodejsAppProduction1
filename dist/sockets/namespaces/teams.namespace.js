"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeTeamsNamespace = void 0;
const logger_1 = require("../../config/logger");
const constants_1 = require("../../utils/constants");
const auth_1 = require("../auth");
const team_socket_1 = require("../team.socket");
const initializeTeamsNamespace = (io) => {
    const namespace = io.of('/teams');
    namespace.on('connection', (socket) => {
        logger_1.logger.info('Socket connected to /teams namespace', { socketId: socket.id });
        const user = (0, auth_1.parseSocketUser)(socket);
        if (!user) {
            logger_1.logger.warn('/teams connection rejected: invalid or missing auth token', {
                socketId: socket.id,
            });
            socket.emit(constants_1.SOCKET_EVENTS.connection.error, { message: 'Authentication required' });
            socket.disconnect(true);
            return;
        }
        socket.user = user;
        (0, team_socket_1.registerTeamSocket)(namespace, socket);
        socket.on('disconnect', (reason) => {
            logger_1.logger.info('Socket disconnected from /teams namespace', {
                socketId: socket.id,
                reason,
            });
        });
    });
};
exports.initializeTeamsNamespace = initializeTeamsNamespace;
//# sourceMappingURL=teams.namespace.js.map