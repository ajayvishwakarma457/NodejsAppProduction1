"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateMiddleware = void 0;
const http_status_codes_1 = require("http-status-codes");
const ApiError_1 = require("../utils/ApiError");
const validateMiddleware = (schema) => (req, _res, next) => {
    const result = schema.safeParse({
        body: req.body,
        params: req.params,
        query: req.query
    });
    if (!result.success) {
        next(new ApiError_1.ApiError(http_status_codes_1.StatusCodes.BAD_REQUEST, result.error.flatten().formErrors.join(", ")));
        return;
    }
    next();
};
exports.validateMiddleware = validateMiddleware;
