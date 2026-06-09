import { Server, Socket } from "socket.io";

export const registerTeamSocket = (io: Server, socket: Socket) => {
  socket.on("team:join", (teamId: string) => {
    void socket.join(`team:${teamId}`);
    io.to(`team:${teamId}`).emit("team:joined", { teamId, socketId: socket.id });
  });
};

