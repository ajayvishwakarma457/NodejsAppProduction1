"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiKeyRepository = void 0;
const api_key_model_1 = require("./api-key.model");
/* ------------------------------------------------------------------ */
// Repository
/* ------------------------------------------------------------------ */
exports.apiKeyRepository = {
    /**
     * Create a new API key document. The plaintext key is never stored.
     */
    async create(data) {
        return api_key_model_1.ApiKeyModel.create(data);
    },
    /**
     * Find a single API key by its public identifier.
     * Includes the hidden keyHash field for verification.
     */
    async findByPublicId(publicId) {
        return api_key_model_1.ApiKeyModel.findOne({ publicId }).select('+keyHash').lean();
    },
    /**
     * Find an active, non-expired API key by public ID.
     */
    async findActiveByPublicId(publicId) {
        return api_key_model_1.ApiKeyModel.findOne({
            publicId,
            isActive: true,
            expiresAt: { $gt: new Date() },
        })
            .select('+keyHash')
            .lean();
    },
    /**
     * List all API keys owned by a user.
     */
    async findByUserId(userId) {
        return api_key_model_1.ApiKeyModel.find({ userId }).sort({ createdAt: -1 }).lean();
    },
    /**
     * Count active API keys owned by a user.
     */
    async countActiveByUserId(userId) {
        return api_key_model_1.ApiKeyModel.countDocuments({ userId, isActive: true });
    },
    /**
     * Update the last used timestamp for an API key.
     */
    async updateLastUsed(id) {
        await api_key_model_1.ApiKeyModel.findByIdAndUpdate(id, { lastUsedAt: new Date() });
    },
    /**
     * Revoke an API key by marking it inactive.
     */
    async revoke(id) {
        return api_key_model_1.ApiKeyModel.findByIdAndUpdate(id, { isActive: false }, { new: true }).lean();
    },
    /**
     * Revoke an API key owned by a specific user.
     */
    async revokeByIdAndUserId(id, userId) {
        return api_key_model_1.ApiKeyModel.findOneAndUpdate({ _id: id, userId }, { isActive: false }, { new: true }).lean();
    },
    /**
     * Delete an API key permanently. Used by tests and admin cleanup flows.
     */
    async deleteById(id) {
        const result = await api_key_model_1.ApiKeyModel.findByIdAndDelete(id);
        return result !== null;
    },
};
//# sourceMappingURL=api-key.repository.js.map