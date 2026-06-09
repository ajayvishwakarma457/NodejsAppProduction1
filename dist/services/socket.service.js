"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.socketService = void 0;
let ioInstance = null;
exports.socketService = {
    setIO(io) {
        ioInstance = io;
    },
    getIO() {
        return ioInstance;
    }
};
