"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestIdMiddleware = void 0;
const crypto_1 = require("crypto");
const MAX_REQUEST_ID_LENGTH = 255;
const VALID_REQUEST_ID_PATTERN = /^[a-zA-Z0-9._:-]+$/;
const sanitizeRequestId = (raw) => {
    if (!raw)
        return (0, crypto_1.randomUUID)();
    const trimmed = raw.trim();
    if (trimmed.length === 0 || trimmed.length > MAX_REQUEST_ID_LENGTH) {
        return (0, crypto_1.randomUUID)();
    }
    // Take only the first value if multiple headers were sent (comma-separated)
    const firstValue = trimmed.split(",")[0].trim();
    if (!VALID_REQUEST_ID_PATTERN.test(firstValue)) {
        return (0, crypto_1.randomUUID)();
    }
    return firstValue;
};
const requestIdMiddleware = (req, res, next) => {
    const requestId = sanitizeRequestId(req.get("X-Request-Id"));
    req.requestId = requestId;
    res.setHeader("X-Request-Id", requestId);
    next();
};
exports.requestIdMiddleware = requestIdMiddleware;
