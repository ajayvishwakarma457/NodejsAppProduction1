"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.morganMiddleware = void 0;
const morgan_1 = __importDefault(require("morgan"));
const env_1 = require("../config/env");
const logger_1 = require("../config/logger");
/**
 * Map an HTTP response status code to the corresponding application log level.
 * Mirrors the level mapping used by the existing Winston request logger.
 */
const statusToLogLevel = (statusCode) => {
    if (statusCode >= 500)
        return 'error';
    if (statusCode >= 400)
        return 'warn';
    return 'info';
};
/**
 * Custom Morgan token that exposes the per-request correlation id
 * attached earlier in the request pipeline by requestIdMiddleware.
 */
morgan_1.default.token('requestId', (req) => req.requestId ?? '-');
/**
 * Custom Morgan token that exposes the authenticated user id, if any.
 */
morgan_1.default.token('userId', (req) => req.user?.id ?? '-');
/**
 * Structured JSON Morgan format.
 *
 * This format is intentionally separate from the built-in 'combined' / 'common'
 * formats so production deployments can emit machine-parseable JSON through the
 * same Winston pipeline used by the rest of the application.
 */
morgan_1.default.format('json', (tokens, req, res) => {
    return JSON.stringify({
        method: tokens.method(req, res),
        url: tokens.url(req, res),
        status: Number(tokens.status(req, res)) || undefined,
        contentLength: tokens.res(req, res, 'content-length'),
        responseTimeMs: Number(tokens['response-time'](req, res)) || undefined,
        requestId: tokens.requestId(req, res),
        userId: tokens.userId(req, res),
        remoteAddr: tokens['remote-addr'](req, res),
        userAgent: tokens['user-agent'](req, res),
        referrer: tokens.referrer(req, res),
        timestamp: new Date().toISOString(),
    });
});
/**
 * Production-grade Morgan HTTP request logging middleware.
 *
 * Features:
 * - Configurable format via MORGAN_FORMAT (default 'combined').
 * - Optional structured JSON format named 'json'.
 * - Custom tokens for requestId and userId correlation.
 * - Output routed through Winston at the appropriate log level:
 *   5xx -> error, 4xx -> warn, otherwise -> info.
 * - Health check requests can be skipped via MORGAN_SKIP_HEALTH_CHECK.
 * - Immediate logging (before response finishes) via MORGAN_IMMEDIATE.
 */
const morganMiddleware = (req, res, next) => {
    const stream = {
        write: (message) => {
            // When immediate logging is enabled the response has not finished yet,
            // so the status code is not meaningful. Log those as info.
            const level = env_1.env.MORGAN_IMMEDIATE ? 'info' : statusToLogLevel(res.statusCode);
            logger_1.logger[level](message.trim());
        },
    };
    const skip = (request) => {
        if (!env_1.env.MORGAN_SKIP_HEALTH_CHECK) {
            return false;
        }
        return request.path === '/health';
    };
    return (0, morgan_1.default)(env_1.env.MORGAN_FORMAT, {
        stream,
        skip,
        immediate: env_1.env.MORGAN_IMMEDIATE,
    })(req, res, next);
};
exports.morganMiddleware = morganMiddleware;
//# sourceMappingURL=morgan.middleware.js.map