"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSockets = void 0;
const notification_socket_1 = require("./notification.socket");
const task_socket_1 = require("./task.socket");
const team_socket_1 = require("./team.socket");
const registerSockets = (io) => {
    io.on("connection", (socket) => {
        (0, task_socket_1.registerTaskSocket)(io, socket);
        (0, notification_socket_1.registerNotificationSocket)(socket);
        (0, team_socket_1.registerTeamSocket)(io, socket);
    });
};
exports.registerSockets = registerSockets;
