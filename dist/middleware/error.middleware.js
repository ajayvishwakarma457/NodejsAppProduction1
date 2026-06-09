"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorMiddleware = void 0;
const http_status_codes_1 = require("http-status-codes");
const ApiError_1 = require("../utils/ApiError");
const errorMiddleware = (error, _req, res, _next) => {
    if (error instanceof ApiError_1.ApiError) {
        res.status(error.statusCode).json({
            success: false,
            message: error.message
        });
        return;
    }
    res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Internal server error"
    });
};
exports.errorMiddleware = errorMiddleware;
