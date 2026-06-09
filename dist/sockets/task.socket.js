"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTaskSocket = void 0;
const logger_1 = require("../config/logger");
const task_service_1 = require("../modules/tasks/task.service");
const constants_1 = require("../utils/constants");
const helpers_1 = require("../utils/helpers");
const socketHandler_1 = require("../utils/socketHandler");
const canAccessTask = (task, userId) => {
    const createdBy = String(task.createdBy);
    const assignedTo = String(task.assignedTo);
    return createdBy === userId || assignedTo === userId;
};
const registerTaskSocket = (io, socket) => {
    (0, socketHandler_1.socketHandler)(socket, constants_1.SOCKET_EVENTS.task.join, async (taskId) => {
        if (!(0, helpers_1.isValidId)(taskId)) {
            logger_1.logger.warn("Invalid task:join payload", { socketId: socket.id, taskId });
            socket.emit(constants_1.SOCKET_EVENTS.task.error, { message: "Invalid taskId" });
            return;
        }
        const userId = socket.user?.id;
        if (!userId) {
            logger_1.logger.warn("task:join rejected: missing user context", { socketId: socket.id });
            socket.emit(constants_1.SOCKET_EVENTS.task.error, { message: "Unauthorized" });
            return;
        }
        const task = await task_service_1.taskService.findById(taskId);
        if (!task) {
            logger_1.logger.warn("task:join rejected: task not found", { socketId: socket.id, taskId });
            socket.emit(constants_1.SOCKET_EVENTS.task.error, { message: "Task not found" });
            return;
        }
        if (!canAccessTask(task, userId)) {
            logger_1.logger.warn("task:join rejected: access denied", { socketId: socket.id, taskId, userId });
            socket.emit(constants_1.SOCKET_EVENTS.task.error, { message: "Access denied" });
            return;
        }
        await socket.join(`${constants_1.SOCKET_ROOM_PREFIX.task}${taskId}`);
        io.to(`${constants_1.SOCKET_ROOM_PREFIX.task}${taskId}`).emit(constants_1.SOCKET_EVENTS.task.joined, { taskId, socketId: socket.id, userId });
        logger_1.logger.info(`Socket ${socket.id} joined task:${taskId}`, { userId });
    });
    (0, socketHandler_1.socketHandler)(socket, constants_1.SOCKET_EVENTS.task.leave, async (taskId) => {
        if (!(0, helpers_1.isValidId)(taskId)) {
            logger_1.logger.warn("Invalid task:leave payload", { socketId: socket.id, taskId });
            socket.emit(constants_1.SOCKET_EVENTS.task.error, { message: "Invalid taskId" });
            return;
        }
        await socket.leave(`${constants_1.SOCKET_ROOM_PREFIX.task}${taskId}`);
        socket.emit(constants_1.SOCKET_EVENTS.task.left, { taskId });
        logger_1.logger.debug(`Socket ${socket.id} left task:${taskId}`);
    });
};
exports.registerTaskSocket = registerTaskSocket;
