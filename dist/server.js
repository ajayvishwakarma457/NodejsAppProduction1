"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const app_1 = require("./app");
const db_1 = require("./config/db");
const env_1 = require("./config/env");
const logger_1 = require("./config/logger");
const redis_service_1 = require("./services/redis.service");
const jobs_1 = require("./jobs");
const sockets_1 = require("./sockets");
const socket_service_1 = require("./services/socket.service");
const events_1 = require("./events");
const socket_io_1 = require("socket.io");
let server = null;
const bootstrap = async () => {
    try {
        await db_1.db.connect();
        await redis_service_1.redisService.connect();
        server = http_1.default.createServer(app_1.app);
        const io = new socket_io_1.Server(server, {
            cors: {
                origin: env_1.env.CLIENT_URL,
            },
        });
        socket_service_1.socketService.setIO(io);
        (0, sockets_1.registerSockets)(io);
        if (env_1.env.EVENT_BUS_ENABLED) {
            (0, events_1.initializeEventBus)();
        }
        server.listen(env_1.env.PORT, () => {
            logger_1.logger.info(`${env_1.env.APP_NAME} listening on port ${env_1.env.PORT}`, {
                env: env_1.env.NODE_ENV,
            });
        });
        jobs_1.jobOrchestrator.startAll();
    }
    catch (error) {
        logger_1.logger.error('Failed to bootstrap application', { error });
        process.exit(1);
    }
};
const gracefulShutdown = async (signal) => {
    logger_1.logger.info(`Received ${signal}. Starting graceful shutdown...`);
    if (server) {
        server.close(() => {
            logger_1.logger.info('HTTP server closed');
        });
    }
    try {
        const io = socket_service_1.socketService.getIO();
        if (io) {
            io.close(() => {
                logger_1.logger.info('Socket.IO server closed');
            });
        }
        await jobs_1.jobOrchestrator.stopAll();
        await db_1.db.disconnect();
        await redis_service_1.redisService.disconnect();
        logger_1.logger.info('Graceful shutdown completed');
        process.exit(0);
    }
    catch (error) {
        logger_1.logger.error('Error during graceful shutdown', { error });
        process.exit(1);
    }
};
process.on('unhandledRejection', (reason) => {
    logger_1.logger.error('Unhandled Rejection', { reason });
    gracefulShutdown('unhandledRejection');
});
process.on('uncaughtException', (error) => {
    logger_1.logger.error('Uncaught Exception', { error });
    gracefulShutdown('uncaughtException');
});
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
void bootstrap();
//# sourceMappingURL=server.js.map