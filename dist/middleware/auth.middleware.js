"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const http_status_codes_1 = require("http-status-codes");
const ApiError_1 = require("../utils/ApiError");
const authMiddleware = (req, _res, next) => {
    const userId = req.header("x-user-id");
    const role = req.header("x-user-role") ?? "member";
    if (!userId) {
        next(new ApiError_1.ApiError(http_status_codes_1.StatusCodes.UNAUTHORIZED, "Authentication required"));
        return;
    }
    req.user = { id: userId, role };
    next();
};
exports.authMiddleware = authMiddleware;
