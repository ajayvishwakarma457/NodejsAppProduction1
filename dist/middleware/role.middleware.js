"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roleMiddleware = void 0;
const http_status_codes_1 = require("http-status-codes");
const logger_1 = require("../config/logger");
const ApiError_1 = require("../utils/ApiError");
const roleMiddleware = (...allowedRoles) => (req, _res, next) => {
    const actualRole = req.user?.role;
    if (!req.user || !allowedRoles.includes(actualRole)) {
        logger_1.logger.warn('Access denied: insufficient role', {
            method: req.method,
            url: req.originalUrl || req.url,
            requestId: req.requestId,
            userId: req.user?.id,
            actualRole,
            requiredRoles: allowedRoles,
        });
        next(new ApiError_1.ApiError(http_status_codes_1.StatusCodes.FORBIDDEN, 'Insufficient permissions', {
            requiredRoles: allowedRoles,
            actualRole,
        }));
        return;
    }
    next();
};
exports.roleMiddleware = roleMiddleware;
//# sourceMappingURL=role.middleware.js.map