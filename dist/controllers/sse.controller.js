"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.streamEvents = void 0;
const sse_service_1 = require("../services/sse.service");
const ApiError_1 = require("../utils/ApiError");
const logger_1 = require("../config/logger");
/**
 * Establish a Server-Sent Events stream for the authenticated user.
 *
 * The connection stays open and receives server-pushed events such as
 * notifications, task updates, and system broadcasts.
 */
const streamEvents = (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        throw ApiError_1.ApiError.unauthorized('Authentication required');
    }
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.status(200);
    sse_service_1.sseService.addClient(res, userId);
    req.on('close', () => {
        sse_service_1.sseService.removeClient(res, userId);
    });
    req.on('error', (err) => {
        logger_1.logger.error('SSE request error', {
            userId,
            error: err instanceof Error ? err.message : String(err),
        });
        sse_service_1.sseService.removeClient(res, userId);
    });
};
exports.streamEvents = streamEvents;
//# sourceMappingURL=sse.controller.js.map