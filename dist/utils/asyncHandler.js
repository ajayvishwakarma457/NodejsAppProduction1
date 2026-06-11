"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = void 0;
const logger_1 = require("../config/logger");
const asyncHandler = (handler) => (req, res, next) => {
    void handler(req, res, next).catch((err) => {
        const error = err instanceof Error ? err : new Error(String(err));
        logger_1.logger.error('Request handler error', {
            method: req.method,
            url: req.originalUrl,
            userId: req.user?.id,
            error: error.message,
        });
        next(error);
    });
};
exports.asyncHandler = asyncHandler;
//# sourceMappingURL=asyncHandler.js.map