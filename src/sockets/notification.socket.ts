import { Socket } from "socket.io";

export const registerNotificationSocket = (socket: Socket) => {
  socket.on("notification:read", (notificationId: string) => {
    socket.emit("notification:ack", { notificationId });
  });
};

