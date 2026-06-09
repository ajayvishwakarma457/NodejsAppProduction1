"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestIdMiddleware = void 0;
const crypto_1 = require("crypto");
const requestIdMiddleware = (req, res, next) => {
    const requestId = req.get("X-Request-Id") || (0, crypto_1.randomUUID)();
    req.requestId = requestId;
    res.setHeader("X-Request-Id", requestId);
    next();
};
exports.requestIdMiddleware = requestIdMiddleware;
