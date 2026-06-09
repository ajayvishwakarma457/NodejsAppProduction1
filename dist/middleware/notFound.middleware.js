"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundMiddleware = void 0;
const http_status_codes_1 = require("http-status-codes");
const logger_1 = require("../config/logger");
const notFoundMiddleware = (req, res) => {
    const message = `Route ${req.method} ${req.originalUrl} not found`;
    logger_1.logger.warn(message, {
        method: req.method,
        url: req.originalUrl,
        path: req.path,
        requestId: req.requestId,
        ip: req.ip,
        ...(req.user?.id ? { userId: req.user.id } : {})
    });
    res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
        success: false,
        message,
        requestId: req.requestId
    });
};
exports.notFoundMiddleware = notFoundMiddleware;
