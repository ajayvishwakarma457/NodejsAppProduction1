"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const path_1 = __importDefault(require("path"));
const mongoose_1 = __importDefault(require("mongoose"));
const auth_routes_1 = require("./modules/auth/auth.routes");
const comment_routes_1 = require("./modules/comments/comment.routes");
const notification_routes_1 = require("./modules/notifications/notification.routes");
const project_routes_1 = require("./modules/projects/project.routes");
const task_routes_1 = require("./modules/tasks/task.routes");
const team_routes_1 = require("./modules/teams/team.routes");
const user_routes_1 = require("./modules/users/user.routes");
const env_1 = require("./config/env");
const logger_1 = require("./config/logger");
const redis_1 = require("./config/redis");
const error_middleware_1 = require("./middleware/error.middleware");
const notFound_middleware_1 = require("./middleware/notFound.middleware");
const requestId_middleware_1 = require("./middleware/requestId.middleware");
const rateLimit_middleware_1 = require("./middleware/rateLimit.middleware");
const auth_middleware_1 = require("./middleware/auth.middleware");
/* ------------------------------------------------------------------ */
// App instance
/* ------------------------------------------------------------------ */
exports.app = (0, express_1.default)();
/* ------------------------------------------------------------------ */
// Trust proxy (required for correct req.ip behind load balancers)
/* ------------------------------------------------------------------ */
if (env_1.env.NODE_ENV === 'production') {
    exports.app.set('trust proxy', 1);
}
/* ------------------------------------------------------------------ */
// Security hardening
/* ------------------------------------------------------------------ */
exports.app.disable('x-powered-by');
exports.app.use((0, helmet_1.default)());
exports.app.use((0, cors_1.default)({
    origin: env_1.env.CLIENT_URL === '*' ? true : env_1.env.CLIENT_URL,
    credentials: true,
}));
/* ------------------------------------------------------------------ */
// Request identification
/* ------------------------------------------------------------------ */
exports.app.use(requestId_middleware_1.requestIdMiddleware);
/* ------------------------------------------------------------------ */
// Request logger
/* ------------------------------------------------------------------ */
exports.app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
        logger_1.logger[logLevel]('HTTP request', {
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            durationMs: duration,
            ip: req.ip,
            requestId: req.requestId,
            userId: req.user?.id,
            userAgent: req.get('user-agent'),
        });
    });
    next();
});
/* ------------------------------------------------------------------ */
// Body parsers
/* ------------------------------------------------------------------ */
exports.app.use(express_1.default.json({ limit: '10kb' }));
exports.app.use(express_1.default.urlencoded({ extended: true, limit: '10kb' }));
/* ------------------------------------------------------------------ */
// Static files (local uploads)
/* ------------------------------------------------------------------ */
if (env_1.env.STORAGE_PROVIDER === 'local') {
    const uploadsPath = path_1.default.resolve(env_1.env.STORAGE_LOCAL_PATH);
    exports.app.use('/uploads', express_1.default.static(uploadsPath, {
        index: false,
        immutable: true,
        maxAge: '1y',
        setHeaders: (res) => {
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        },
    }));
}
/* ------------------------------------------------------------------ */
// Health check
/* ------------------------------------------------------------------ */
exports.app.get('/health', async (_req, res) => {
    const checks = {
        server: 'ok',
    };
    // MongoDB connectivity check
    try {
        const mongoState = mongoose_1.default.connection.readyState;
        checks.mongodb = mongoState === 1 ? 'ok' : 'error';
    }
    catch {
        checks.mongodb = 'error';
    }
    // Redis connectivity check
    try {
        const redisPing = await redis_1.redisClient.ping();
        checks.redis = redisPing === 'PONG' ? 'ok' : 'error';
    }
    catch {
        checks.redis = 'error';
    }
    const allHealthy = Object.values(checks).every((status) => status === 'ok');
    const statusCode = allHealthy ? 200 : 503;
    res.status(statusCode).json({
        success: allHealthy,
        message: allHealthy ? 'OK' : 'Service unhealthy',
        checks,
        timestamp: new Date().toISOString(),
    });
});
/* ------------------------------------------------------------------ */
// Rate limiting (after optional auth so user-based limits work)
/* ------------------------------------------------------------------ */
exports.app.use(auth_middleware_1.optionalAuthMiddleware);
exports.app.use(rateLimit_middleware_1.rateLimitMiddleware);
/* ------------------------------------------------------------------ */
// API routes
/* ------------------------------------------------------------------ */
exports.app.use('/api/v1/auth', auth_routes_1.authRouter);
exports.app.use('/api/v1/users', user_routes_1.userRouter);
exports.app.use('/api/v1/teams', team_routes_1.teamRouter);
exports.app.use('/api/v1/projects', project_routes_1.projectRouter);
exports.app.use('/api/v1/tasks', task_routes_1.taskRouter);
exports.app.use('/api/v1/comments', comment_routes_1.commentRouter);
exports.app.use('/api/v1/notifications', notification_routes_1.notificationRouter);
/* ------------------------------------------------------------------ */
// Error handling
/* ------------------------------------------------------------------ */
exports.app.use(notFound_middleware_1.notFoundMiddleware);
exports.app.use(error_middleware_1.errorMiddleware);
//# sourceMappingURL=app.js.map