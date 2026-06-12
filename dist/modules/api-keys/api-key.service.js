"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiKeyService = void 0;
const crypto_1 = require("crypto");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const env_1 = require("../../config/env");
const ApiError_1 = require("../../utils/ApiError");
const user_repository_1 = require("../users/user.repository");
const api_key_repository_1 = require("./api-key.repository");
const api_key_model_1 = require("./api-key.model");
/* ------------------------------------------------------------------ */
// Helpers
/* ------------------------------------------------------------------ */
const toBase64Url = (buffer) => {
    return buffer.toString('base64url').replace(/=+$/, '');
};
const generatePublicId = () => toBase64Url((0, crypto_1.randomBytes)(16));
const generateSecret = () => toBase64Url((0, crypto_1.randomBytes)(32));
const parseApiKey = (apiKey) => {
    const prefix = env_1.env.API_KEY_PREFIX;
    if (!apiKey.startsWith(prefix))
        return null;
    const withoutPrefix = apiKey.slice(prefix.length);
    const separatorIndex = withoutPrefix.indexOf('_');
    if (separatorIndex === -1)
        return null;
    const publicId = withoutPrefix.slice(0, separatorIndex);
    const secret = withoutPrefix.slice(separatorIndex + 1);
    if (!publicId || !secret)
        return null;
    return { publicId, secret };
};
/* ------------------------------------------------------------------ */
// Service
/* ------------------------------------------------------------------ */
exports.apiKeyService = {
    /**
     * Hash an API key using bcrypt. The cost factor is configurable via env.
     */
    async hashApiKey(apiKey) {
        return bcryptjs_1.default.hash(apiKey, env_1.env.API_KEY_HASH_SALT_ROUNDS);
    },
    /**
     * Generate a new API key for a user. The plaintext key is returned exactly once.
     */
    async generateApiKey(userId, options) {
        const activeCount = await api_key_repository_1.apiKeyRepository.countActiveByUserId(userId);
        if (activeCount >= env_1.env.API_KEY_MAX_KEYS_PER_USER) {
            throw ApiError_1.ApiError.conflict(`Maximum number of API keys (${env_1.env.API_KEY_MAX_KEYS_PER_USER}) reached. Revoke an existing key before creating a new one.`);
        }
        const publicId = generatePublicId();
        const secret = generateSecret();
        const apiKey = `${env_1.env.API_KEY_PREFIX}${publicId}_${secret}`;
        const keyHash = await this.hashApiKey(apiKey);
        const keyPrefix = apiKey.slice(0, 12);
        const expiresInDays = options.expiresInDays ?? env_1.env.API_KEY_DEFAULT_EXPIRY_DAYS;
        const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
        const scopes = options.scopes?.length ? options.scopes : ['read', 'write'];
        const invalidScopes = scopes.filter((s) => !api_key_model_1.API_KEY_SCOPES.includes(s));
        if (invalidScopes.length > 0) {
            throw ApiError_1.ApiError.badRequest(`Invalid API key scopes: ${invalidScopes.join(', ')}`);
        }
        const metadata = await api_key_repository_1.apiKeyRepository.create({
            userId: userId,
            name: options.name,
            publicId,
            keyHash,
            keyPrefix,
            role: options.role,
            scopes,
            expiresAt,
        });
        return { apiKey, metadata };
    },
    /**
     * Validate an API key and return the associated user context.
     * Returns null if the key is invalid, revoked, or expired.
     */
    async validateApiKey(apiKey) {
        const parsed = parseApiKey(apiKey);
        if (!parsed)
            return null;
        const apiKeyDoc = await api_key_repository_1.apiKeyRepository.findActiveByPublicId(parsed.publicId);
        if (!apiKeyDoc)
            return null;
        const isValid = await bcryptjs_1.default.compare(apiKey, apiKeyDoc.keyHash);
        if (!isValid)
            return null;
        const user = await user_repository_1.userRepository.findById(String(apiKeyDoc.userId));
        if (!user)
            return null;
        // Update last used asynchronously; failures should not block authentication.
        api_key_repository_1.apiKeyRepository
            .updateLastUsed(String(apiKeyDoc._id))
            .catch(() => {
            // Best-effort tracking; swallow errors to keep requests resilient.
        });
        return {
            id: String(apiKeyDoc.userId),
            email: String(user.email),
            role: String(apiKeyDoc.role),
            apiKeyId: String(apiKeyDoc._id),
            scopes: apiKeyDoc.scopes,
        };
    },
    /**
     * List all API keys owned by a user. Never includes the plaintext key or hash.
     */
    async listApiKeys(userId) {
        return api_key_repository_1.apiKeyRepository.findByUserId(userId);
    },
    /**
     * Revoke an API key. Only the owner can revoke their own keys.
     */
    async revokeApiKey(userId, keyId) {
        const revoked = await api_key_repository_1.apiKeyRepository.revokeByIdAndUserId(keyId, userId);
        if (!revoked) {
            throw ApiError_1.ApiError.notFound('API key not found');
        }
    },
};
//# sourceMappingURL=api-key.service.js.map