"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuthMiddleware = exports.authMiddleware = void 0;
const ApiError_1 = require("../utils/ApiError");
const token_service_1 = require("../services/token.service");
const extractBearerToken = (req) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || typeof authHeader !== 'string')
        return null;
    const [scheme, token] = authHeader.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token)
        return null;
    return token;
};
/** Require a valid access token. Attaches decoded user to req.user. */
const authMiddleware = async (req, _res, next) => {
    try {
        const token = extractBearerToken(req);
        if (!token) {
            next(ApiError_1.ApiError.unauthorized('Access token required'));
            return;
        }
        const isBlacklisted = await token_service_1.tokenService.isBlacklisted(token);
        if (isBlacklisted) {
            next(ApiError_1.ApiError.unauthorized('Token has been revoked'));
            return;
        }
        const payload = token_service_1.tokenService.verifyAccessToken(token);
        req.user = {
            id: payload.sub,
            email: payload.email,
            role: payload.role,
        };
        next();
    }
    catch (error) {
        if (error instanceof ApiError_1.ApiError) {
            next(error);
            return;
        }
        next(ApiError_1.ApiError.unauthorized('Authentication failed'));
    }
};
exports.authMiddleware = authMiddleware;
/** Optional auth: attaches user if token is present and valid, otherwise continues anonymously. */
const optionalAuthMiddleware = async (req, _res, next) => {
    try {
        const token = extractBearerToken(req);
        if (!token) {
            next();
            return;
        }
        const isBlacklisted = await token_service_1.tokenService.isBlacklisted(token);
        if (isBlacklisted) {
            next();
            return;
        }
        const payload = token_service_1.tokenService.verifyAccessToken(token);
        req.user = {
            id: payload.sub,
            email: payload.email,
            role: payload.role,
        };
        next();
    }
    catch {
        next();
    }
};
exports.optionalAuthMiddleware = optionalAuthMiddleware;
//# sourceMappingURL=auth.middleware.js.map