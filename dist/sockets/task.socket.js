"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTaskSocket = void 0;
const registerTaskSocket = (io, socket) => {
    socket.on("task:join", (taskId) => {
        void socket.join(`task:${taskId}`);
        io.to(`task:${taskId}`).emit("task:joined", { taskId, socketId: socket.id });
    });
};
exports.registerTaskSocket = registerTaskSocket;
