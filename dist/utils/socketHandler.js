"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.socketHandler = void 0;
const logger_1 = require("../config/logger");
const socketHandler = (socket, event, handler) => {
    socket.on(event, (...args) => {
        try {
            const result = handler(...args);
            if (result instanceof Promise) {
                void result.catch((err) => {
                    const error = err instanceof Error ? err : new Error(String(err));
                    logger_1.logger.error(`Socket event "${event}" failed`, {
                        socketId: socket.id,
                        error: error.message
                    });
                });
            }
        }
        catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            logger_1.logger.error(`Socket event "${event}" failed`, {
                socketId: socket.id,
                error: error.message
            });
        }
    });
};
exports.socketHandler = socketHandler;
