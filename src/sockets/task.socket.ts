import { Server, Socket } from "socket.io";

export const registerTaskSocket = (io: Server, socket: Socket) => {
  socket.on("task:join", (taskId: string) => {
    void socket.join(`task:${taskId}`);
    io.to(`task:${taskId}`).emit("task:joined", { taskId, socketId: socket.id });
  });
};

