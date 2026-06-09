"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTeamSocket = void 0;
const registerTeamSocket = (io, socket) => {
    socket.on("team:join", (teamId) => {
        void socket.join(`team:${teamId}`);
        io.to(`team:${teamId}`).emit("team:joined", { teamId, socketId: socket.id });
    });
};
exports.registerTeamSocket = registerTeamSocket;
