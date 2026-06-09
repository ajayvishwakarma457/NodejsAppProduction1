"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roleMiddleware = void 0;
const http_status_codes_1 = require("http-status-codes");
const ApiError_1 = require("../utils/ApiError");
const roleMiddleware = (...allowedRoles) => (req, _res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
        next(new ApiError_1.ApiError(http_status_codes_1.StatusCodes.FORBIDDEN, "Insufficient permissions"));
        return;
    }
    next();
};
exports.roleMiddleware = roleMiddleware;
