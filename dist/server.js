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
const sockets_1 = require("./sockets");
const socket_service_1 = require("./services/socket.service");
const socket_io_1 = require("socket.io");
// ─── Production Config ───────────────────────────────────────
const GRACEFUL_SHUTDOWN_TIMEOUT = 10000; // 10s to finish requests
const KEEP_ALIVE_TIMEOUT = 65000; // Slightly > ALB/NGINX timeout
const bootstrap = async () => {
    let server;
    let io;
    try {
        // 1. Database connection with retry logic
        await db_1.db.connect().catch((err) => {
            logger_1.logger.error("Database connection failed", { error: err.message });
            process.exit(1); // Fail fast — container orchestrator will restart
        });
        logger_1.logger.info("Database connected");
        // 2. Create HTTP server
        server = http_1.default.createServer(app_1.app);
        server.keepAliveTimeout = KEEP_ALIVE_TIMEOUT;
        server.headersTimeout = KEEP_ALIVE_TIMEOUT + 5000;
        // 3. Socket.IO with production CORS (restrict origins!)
        io = new socket_io_1.Server(server, {
            cors: {
                origin: env_1.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:3000"],
                methods: ["GET", "POST"],
                credentials: true,
            },
            // Production: use Redis adapter for multi-instance scaling
            // adapter: createAdapter(pubClient, subClient),
            pingTimeout: 60000,
            pingInterval: 25000,
        });
        socket_service_1.socketService.setIO(io);
        (0, sockets_1.registerSockets)(io);
        // 4. Graceful shutdown handlers
        const gracefulShutdown = async (signal) => {
            logger_1.logger.info(`Received ${signal}, starting graceful shutdown...`);
            // Stop accepting new connections
            server.close(async () => {
                logger_1.logger.info("HTTP server closed");
                // Disconnect all socket clients
                io.close(() => {
                    logger_1.logger.info("Socket.IO server closed");
                });
                // Close database connection
                await db_1.db.disconnect().catch(() => { });
                logger_1.logger.info("Database disconnected");
                process.exit(0);
            });
            // Force exit after timeout
            setTimeout(() => {
                logger_1.logger.error("Forced shutdown — timeout exceeded");
                process.exit(1);
            }, GRACEFUL_SHUTDOWN_TIMEOUT);
        };
        process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
        process.on("SIGINT", () => gracefulShutdown("SIGINT"));
        // 5. Handle uncaught errors (production safety net)
        process.on("uncaughtException", (err) => {
            logger_1.logger.error("Uncaught Exception", { error: err.message, stack: err.stack });
            gracefulShutdown("uncaughtException");
        });
        process.on("unhandledRejection", (reason) => {
            logger_1.logger.error("Unhandled Rejection", { reason });
            gracefulShutdown("unhandledRejection");
        });
        // 6. Start listening
        server.listen(env_1.env.PORT, () => {
            logger_1.logger.info(`${env_1.env.APP_NAME} listening on port ${env_1.env.PORT}`, {
                env: env_1.env.NODE_ENV,
                port: env_1.env.PORT,
                pid: process.pid,
            });
        });
    }
    catch (error) {
        logger_1.logger.error("Bootstrap failed", { error: error.message });
        process.exit(1);
    }
};
// ─── Entry Point ─────────────────────────────────────────────
void bootstrap();
