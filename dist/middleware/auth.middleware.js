"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuthMiddleware = exports.authMiddleware = void 0;
const env_1 = require("../config/env");
const ApiError_1 = require("../utils/ApiError");
const token_service_1 = require("../services/token.service");
const api_key_service_1 = require("../modules/api-keys/api-key.service");
const extractBearerToken = (req) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || typeof authHeader !== 'string')
        return null;
    const [scheme, token] = authHeader.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token)
        return null;
    return token;
};
const extractApiKey = (req) => {
    const value = req.headers[env_1.env.API_KEY_HEADER_NAME.toLowerCase()];
    if (!value || typeof value !== 'string')
        return null;
    return value.trim();
};
const authenticateJwt = async (req) => {
    const token = extractBearerToken(req);
    if (!token)
        return false;
    const isBlacklisted = await token_service_1.tokenService.isBlacklisted(token);
    if (isBlacklisted) {
        throw ApiError_1.ApiError.unauthorized('Token has been revoked');
    }
    const payload = token_service_1.tokenService.verifyAccessToken(token);
    req.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
    };
    req.authType = 'jwt';
    return true;
};
const authenticateApiKey = async (req) => {
    const apiKey = extractApiKey(req);
    if (!apiKey)
        return false;
    const result = await api_key_service_1.apiKeyService.validateApiKey(apiKey);
    if (!result) {
        throw ApiError_1.ApiError.unauthorized('Invalid API key');
    }
    req.user = {
        id: result.id,
        email: result.email,
        role: result.role,
    };
    req.authType = 'apiKey';
    return true;
};
/** Require a valid access token or API key. Attaches decoded user to req.user. */
const authMiddleware = async (req, _res, next) => {
    try {
        const hasBearerToken = extractBearerToken(req) !== null;
        if (hasBearerToken) {
            await authenticateJwt(req);
            next();
            return;
        }
        const hasApiKey = extractApiKey(req) !== null;
        if (hasApiKey) {
            await authenticateApiKey(req);
            next();
            return;
        }
        next(ApiError_1.ApiError.unauthorized('Access token or API key required'));
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
/** Optional auth: attaches user if token or API key is present and valid, otherwise continues anonymously. */
const optionalAuthMiddleware = async (req, _res, next) => {
    try {
        const isJwtAuthenticated = await authenticateJwt(req);
        if (isJwtAuthenticated) {
            next();
            return;
        }
        await authenticateApiKey(req);
        next();
    }
    catch {
        next();
    }
};
exports.optionalAuthMiddleware = optionalAuthMiddleware;
//# sourceMappingURL=auth.middleware.js.map