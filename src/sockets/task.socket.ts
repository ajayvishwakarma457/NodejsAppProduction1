import { Server, Socket } from "socket.io";
import { logger } from "../config/logger";
import { taskService } from "../modules/tasks/task.service";
import { SOCKET_EVENTS, SOCKET_ROOM_PREFIX } from "../utils/constants";
import { isValidId } from "../utils/helpers";
import { socketHandler } from "../utils/socketHandler";

const canAccessTask = (task: { createdBy: unknown; assignedTo: unknown }, userId: string): boolean => {
  const createdBy = String(task.createdBy);
  const assignedTo = String(task.assignedTo);
  return createdBy === userId || assignedTo === userId;
};

export const registerTaskSocket = (io: Server, socket: Socket) => {
  socketHandler(socket, SOCKET_EVENTS.task.join, async (taskId: unknown) => {
    if (!isValidId(taskId)) {
      logger.warn("Invalid task:join payload", { socketId: socket.id, taskId });
      socket.emit(SOCKET_EVENTS.task.error, { message: "Invalid taskId" });
      return;
    }

    const userId = socket.user?.id;
    if (!userId) {
      logger.warn("task:join rejected: missing user context", { socketId: socket.id });
      socket.emit(SOCKET_EVENTS.task.error, { message: "Unauthorized" });
      return;
    }

    const task = await taskService.getById(taskId as string);
    if (!task) {
      logger.warn("task:join rejected: task not found", { socketId: socket.id, taskId });
      socket.emit(SOCKET_EVENTS.task.error, { message: "Task not found" });
      return;
    }

    if (!canAccessTask(task, userId)) {
      logger.warn("task:join rejected: access denied", { socketId: socket.id, taskId, userId });
      socket.emit(SOCKET_EVENTS.task.error, { message: "Access denied" });
      return;
    }

    await socket.join(`${SOCKET_ROOM_PREFIX.task}${taskId}`);
    io.to(`${SOCKET_ROOM_PREFIX.task}${taskId}`).emit(SOCKET_EVENTS.task.joined, { taskId, socketId: socket.id, userId });
    logger.info(`Socket ${socket.id} joined task:${taskId}`, { userId });
  });

  socketHandler(socket, SOCKET_EVENTS.task.leave, async (taskId: unknown) => {
    if (!isValidId(taskId)) {
      logger.warn("Invalid task:leave payload", { socketId: socket.id, taskId });
      socket.emit(SOCKET_EVENTS.task.error, { message: "Invalid taskId" });
      return;
    }

    await socket.leave(`${SOCKET_ROOM_PREFIX.task}${taskId}`);
    socket.emit(SOCKET_EVENTS.task.left, { taskId });
    logger.debug(`Socket ${socket.id} left task:${taskId}`);
  });
};
