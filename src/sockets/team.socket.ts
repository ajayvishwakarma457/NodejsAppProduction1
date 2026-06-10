import { Server, Socket } from "socket.io";
import { logger } from "../config/logger";
import { teamService } from "../modules/teams/team.service";
import { SOCKET_EVENTS, SOCKET_ROOM_PREFIX } from "../utils/constants";
import { isValidId } from "../utils/helpers";
import { socketHandler } from "../utils/socketHandler";

const isTeamMember = (team: { ownerId: unknown; members: { userId: unknown }[] }, userId: string): boolean => {
  if (String(team.ownerId) === userId) return true;
  return team.members.some((member) => String(member.userId) === userId);
};

export const registerTeamSocket = (io: Server, socket: Socket) => {
  socketHandler(socket, SOCKET_EVENTS.team.join, async (teamId: unknown) => {
    if (!isValidId(teamId)) {
      logger.warn("Invalid team:join payload", { socketId: socket.id, teamId });
      socket.emit(SOCKET_EVENTS.team.error, { message: "Invalid teamId" });
      return;
    }

    const userId = socket.user?.id;
    if (!userId) {
      logger.warn("team:join rejected: missing user context", { socketId: socket.id });
      socket.emit(SOCKET_EVENTS.team.error, { message: "Unauthorized" });
      return;
    }

    const team = await teamService.getById(teamId as string);
    if (!team) {
      logger.warn("team:join rejected: team not found", { socketId: socket.id, teamId });
      socket.emit(SOCKET_EVENTS.team.error, { message: "Team not found" });
      return;
    }

    if (!isTeamMember(team, userId)) {
      logger.warn("team:join rejected: not a team member", { socketId: socket.id, teamId, userId });
      socket.emit(SOCKET_EVENTS.team.error, { message: "Access denied" });
      return;
    }

    await socket.join(`${SOCKET_ROOM_PREFIX.team}${teamId}`);
    io.to(`${SOCKET_ROOM_PREFIX.team}${teamId}`).emit(SOCKET_EVENTS.team.joined, { teamId, socketId: socket.id, userId });
    logger.info(`Socket ${socket.id} joined team:${teamId}`, { userId });
  });

  socketHandler(socket, SOCKET_EVENTS.team.leave, async (teamId: unknown) => {
    if (!isValidId(teamId)) {
      logger.warn("Invalid team:leave payload", { socketId: socket.id, teamId });
      socket.emit(SOCKET_EVENTS.team.error, { message: "Invalid teamId" });
      return;
    }

    await socket.leave(`${SOCKET_ROOM_PREFIX.team}${teamId}`);
    socket.emit(SOCKET_EVENTS.team.left, { teamId });
    logger.debug(`Socket ${socket.id} left team:${teamId}`);
  });
};
