"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.socketService = void 0;
const logger_1 = require("../config/logger");
let ioInstance = null;
const ensureInitialized = () => {
    if (!ioInstance) {
        throw new Error('Socket.IO has not been initialized. Call setIO() first.');
    }
    return ioInstance;
};
exports.socketService = {
    setIO(io) {
        if (ioInstance) {
            logger_1.logger.warn('Socket.IO instance is being overwritten');
        }
        ioInstance = io;
    },
    getIO() {
        return ensureInitialized();
    },
    emitToRoom(room, event, data) {
        const io = ensureInitialized();
        io.to(room).emit(event, data);
    },
    emitToAll(event, data) {
        const io = ensureInitialized();
        io.emit(event, data);
    },
    getConnectedCount() {
        const io = ensureInitialized();
        return io.engine.clientsCount;
    },
    getSocketById(socketId) {
        const io = ensureInitialized();
        return io.sockets.sockets.get(socketId);
    },
    disconnectSocket(socketId, reason) {
        const socket = this.getSocketById(socketId);
        if (socket) {
            socket.disconnect(true);
            logger_1.logger.info(`Socket ${socketId} disconnected`, { reason });
        }
    },
};
//# sourceMappingURL=socket.service.js.map