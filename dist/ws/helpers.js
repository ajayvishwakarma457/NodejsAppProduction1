"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMessage = void 0;
const ws_1 = require("ws");
const sendMessage = (socket, event, payload) => {
    if (socket.readyState === ws_1.WebSocket.OPEN) {
        socket.send(JSON.stringify({ event, payload }));
    }
};
exports.sendMessage = sendMessage;
//# sourceMappingURL=helpers.js.map