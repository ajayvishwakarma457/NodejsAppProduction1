"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerNotificationSocket = void 0;
const registerNotificationSocket = (socket) => {
    socket.on("notification:read", (notificationId) => {
        socket.emit("notification:ack", { notificationId });
    });
};
exports.registerNotificationSocket = registerNotificationSocket;
