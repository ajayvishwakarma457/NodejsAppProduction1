import { Server } from "socket.io";
import { registerNotificationSocket } from "./notification.socket";
import { registerTaskSocket } from "./task.socket";
import { registerTeamSocket } from "./team.socket";

export const registerSockets = (io: Server) => {
  io.on("connection", (socket) => {
    registerTaskSocket(io, socket);
    registerNotificationSocket(socket);
    registerTeamSocket(io, socket);
  });
};

