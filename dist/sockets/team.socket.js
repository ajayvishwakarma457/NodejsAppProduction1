"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTeamSocket = void 0;
const logger_1 = require("../config/logger");
const team_service_1 = require("../modules/teams/team.service");
const constants_1 = require("../utils/constants");
const helpers_1 = require("../utils/helpers");
const socketHandler_1 = require("../utils/socketHandler");
const isTeamMember = (team, userId) => {
    if (String(team.ownerId) === userId)
        return true;
    return team.members.some((member) => String(member.userId) === userId);
};
const registerTeamSocket = (io, socket) => {
    (0, socketHandler_1.socketHandler)(socket, constants_1.SOCKET_EVENTS.team.join, async (teamId) => {
        if (!(0, helpers_1.isValidId)(teamId)) {
            logger_1.logger.warn('Invalid team:join payload', { socketId: socket.id, teamId });
            socket.emit(constants_1.SOCKET_EVENTS.team.error, { message: 'Invalid teamId' });
            return;
        }
        const userId = socket.user?.id;
        if (!userId) {
            logger_1.logger.warn('team:join rejected: missing user context', { socketId: socket.id });
            socket.emit(constants_1.SOCKET_EVENTS.team.error, { message: 'Unauthorized' });
            return;
        }
        const team = await team_service_1.teamService.getById(teamId);
        if (!team) {
            logger_1.logger.warn('team:join rejected: team not found', { socketId: socket.id, teamId });
            socket.emit(constants_1.SOCKET_EVENTS.team.error, { message: 'Team not found' });
            return;
        }
        if (!isTeamMember(team, userId)) {
            logger_1.logger.warn('team:join rejected: not a team member', { socketId: socket.id, teamId, userId });
            socket.emit(constants_1.SOCKET_EVENTS.team.error, { message: 'Access denied' });
            return;
        }
        await socket.join(`${constants_1.SOCKET_ROOM_PREFIX.team}${teamId}`);
        io.to(`${constants_1.SOCKET_ROOM_PREFIX.team}${teamId}`).emit(constants_1.SOCKET_EVENTS.team.joined, {
            teamId,
            socketId: socket.id,
            userId,
        });
        logger_1.logger.info(`Socket ${socket.id} joined team:${teamId}`, { userId });
    });
    (0, socketHandler_1.socketHandler)(socket, constants_1.SOCKET_EVENTS.team.leave, async (teamId) => {
        if (!(0, helpers_1.isValidId)(teamId)) {
            logger_1.logger.warn('Invalid team:leave payload', { socketId: socket.id, teamId });
            socket.emit(constants_1.SOCKET_EVENTS.team.error, { message: 'Invalid teamId' });
            return;
        }
        await socket.leave(`${constants_1.SOCKET_ROOM_PREFIX.team}${teamId}`);
        socket.emit(constants_1.SOCKET_EVENTS.team.left, { teamId });
        logger_1.logger.debug(`Socket ${socket.id} left team:${teamId}`);
    });
};
exports.registerTeamSocket = registerTeamSocket;
//# sourceMappingURL=team.socket.js.map