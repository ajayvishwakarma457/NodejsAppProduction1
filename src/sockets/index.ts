import { Server, Socket } from "socket.io";
import { logger } from "../config/logger";
import { SOCKET_EVENTS, TOKEN_PREFIX } from "../utils/constants";
import { registerNotificationSocket } from "./notification.socket";
import { registerTaskSocket } from "./task.socket";
import { registerTeamSocket } from "./team.socket";

const parseSocketUser = (socket: Socket): { id: string; role: string } | null => {
  const token = socket.handshake.auth.token as string | undefined;
  if (!token || !token.startsWith(TOKEN_PREFIX.access)) return null;
  const userId = token.replace(TOKEN_PREFIX.access, "");
  if (!userId) return null;
  const role = (socket.handshake.auth.role as string) || "member";
  return { id: userId, role };
};

export const registerSockets = (io: Server) => {
  io.on("connection", (socket) => {
    try {
      logger.info("Socket connected", {
        socketId: socket.id,
        ip: socket.handshake.address
      });

      const user = parseSocketUser(socket);
      if (!user) {
        logger.warn("Socket connection rejected: invalid or missing auth token", {
          socketId: socket.id
        });
        socket.emit(SOCKET_EVENTS.connection.error, { message: "Authentication required" });
        socket.disconnect(true);
        return;
      }

      socket.user = user;

      registerTaskSocket(io, socket);
      registerNotificationSocket(socket);
      registerTeamSocket(io, socket);

      socket.on("disconnect", (reason) => {
        logger.info("Socket disconnected", {
          socketId: socket.id,
          reason
        });
      });

      socket.on("error", (err) => {
        logger.error("Socket error", {
          socketId: socket.id,
          error: err instanceof Error ? err.message : String(err)
        });
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error("Unhandled error in socket connection handler", {
        socketId: socket.id,
        error: error.message
      });
      socket.disconnect(true);
    }
  });
};
