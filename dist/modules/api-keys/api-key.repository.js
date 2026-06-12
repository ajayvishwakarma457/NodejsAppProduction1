"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiKeyRepository = void 0;
const api_key_model_1 = require("./api-key.model");
const pagination_1 = require("../../utils/pagination");
const query_optimizer_1 = require("../../utils/query-optimizer");
/* ------------------------------------------------------------------ */
// Helpers
/* ------------------------------------------------------------------ */
const buildFilterQuery = (filter) => {
    const query = {};
    if (filter.userId) {
        query.userId = filter.userId;
    }
    if (filter.isActive !== undefined) {
        query.isActive = filter.isActive;
    }
    if (filter.scopes && filter.scopes.length > 0) {
        query.scopes = { $all: filter.scopes };
    }
    return query;
};
/* ------------------------------------------------------------------ */
// Repository
/* ------------------------------------------------------------------ */
exports.apiKeyRepository = {
    /**
     * Find all API keys with pagination, sorting, and optional filtering.
     */
    async findAll(options, filter = {}) {
        const query = buildFilterQuery(filter);
        const skip = (options.page - 1) * options.limit;
        const sortDirection = options.order === 'desc' ? -1 : 1;
        const listQuery = api_key_model_1.ApiKeyModel.find(query)
            .sort({ [options.sort]: sortDirection })
            .skip(skip)
            .limit(options.limit)
            .select((0, query_optimizer_1.buildListProjection)())
            .lean();
        const [data, total] = await Promise.all([
            (0, query_optimizer_1.timedQuery)(listQuery, { collection: 'api_keys', operation: 'findAll' }),
            api_key_model_1.ApiKeyModel.countDocuments(query),
        ]);
        return {
            data,
            meta: (0, pagination_1.buildPaginationMeta)(options.page, options.limit, total),
        };
    },
    /**
     * Find an API key by its MongoDB _id.
     */
    async findById(id) {
        const query = api_key_model_1.ApiKeyModel.findById(id).select((0, query_optimizer_1.buildListProjection)()).lean();
        return (0, query_optimizer_1.timedQuery)(query, { collection: 'api_keys', operation: 'findById' });
    },
    /**
     * Find an API key by its public id.
     */
    async findByPublicId(publicId) {
        const query = api_key_model_1.ApiKeyModel.findOne({ publicId })
            .select((0, query_optimizer_1.buildListProjection)())
            .lean();
        return (0, query_optimizer_1.timedQuery)(query, { collection: 'api_keys', operation: 'findByPublicId' });
    },
    /**
     * Find an active, non-expired API key by its public id.
     */
    async findActiveByPublicId(publicId) {
        const query = api_key_model_1.ApiKeyModel.findOne({
            publicId,
            isActive: true,
            expiresAt: { $gt: new Date() },
        })
            .select('+keyHash')
            .lean();
        return (0, query_optimizer_1.timedQuery)(query, { collection: 'api_keys', operation: 'findActiveByPublicId' });
    },
    /**
     * Find an API key by its hashed key value.
     */
    async findByKeyHash(keyHash) {
        const query = api_key_model_1.ApiKeyModel.findOne({ keyHash })
            .select((0, query_optimizer_1.buildListProjection)())
            .lean();
        return (0, query_optimizer_1.timedQuery)(query, { collection: 'api_keys', operation: 'findByKeyHash' });
    },
    /**
     * Find API keys for a specific user.
     */
    async findByUserId(userId) {
        const query = api_key_model_1.ApiKeyModel.find({ userId })
            .sort({ createdAt: -1 })
            .select((0, query_optimizer_1.buildListProjection)())
            .lean();
        return (0, query_optimizer_1.timedQuery)(query, { collection: 'api_keys', operation: 'findByUserId' });
    },
    /**
     * Create a new API key document.
     */
    async create(data, session) {
        const doc = new api_key_model_1.ApiKeyModel(data);
        return doc.save({ session });
    },
    /**
     * Update an API key by id. Returns the updated document or null.
     */
    async updateById(id, data, session) {
        const query = api_key_model_1.ApiKeyModel.findByIdAndUpdate(id, data, { new: true, session })
            .select((0, query_optimizer_1.buildListProjection)())
            .lean();
        return (0, query_optimizer_1.timedQuery)(query, { collection: 'api_keys', operation: 'updateById' });
    },
    /**
     * Update the lastUsedAt timestamp for an API key.
     */
    async updateLastUsed(id, session) {
        await api_key_model_1.ApiKeyModel.updateOne({ _id: id }, { lastUsedAt: new Date() }, { session });
    },
    /**
     * Revoke an API key by id. Returns true if a document was modified.
     */
    async revokeById(id, session) {
        const result = await api_key_model_1.ApiKeyModel.updateOne({ _id: id }, { isActive: false, revokedAt: new Date() }, { session });
        return result.matchedCount > 0;
    },
    /**
     * Revoke an API key by id and owner userId.
     * Returns true if a document was modified.
     */
    async revokeByIdAndUserId(id, userId, session) {
        const result = await api_key_model_1.ApiKeyModel.updateOne({ _id: id, userId }, { isActive: false, revokedAt: new Date() }, { session });
        return result.matchedCount > 0;
    },
    /**
     * Delete an API key by id. Returns true if a document was deleted.
     */
    async deleteById(id, session) {
        const result = await api_key_model_1.ApiKeyModel.findByIdAndDelete(id, { session });
        return result !== null;
    },
    /**
     * Delete multiple API keys matching a filter.
     */
    async deleteMany(filter, session) {
        const result = await api_key_model_1.ApiKeyModel.deleteMany(filter, { session });
        return result.deletedCount ?? 0;
    },
    /**
     * Check whether an API key with the given id exists.
     */
    async exists(id) {
        const doc = await api_key_model_1.ApiKeyModel.exists({ _id: id });
        return doc !== null;
    },
    /**
     * Count active API keys for a user.
     */
    async countActiveByUserId(userId) {
        return api_key_model_1.ApiKeyModel.countDocuments({
            userId,
            isActive: true,
            expiresAt: { $gt: new Date() },
        });
    },
    /**
     * Revoke all active API keys for a user.
     * Returns the number of documents modified.
     */
    async revokeAllByUserId(userId, session) {
        const result = await api_key_model_1.ApiKeyModel.updateMany({ userId, isActive: true }, { isActive: false, revokedAt: new Date() }, { session });
        return result.modifiedCount ?? 0;
    },
    /**
     * Delete expired API keys older than their expiresAt date.
     * Returns the number of documents deleted.
     */
    async deleteExpired() {
        const result = await api_key_model_1.ApiKeyModel.deleteMany({
            expiresAt: { $lt: new Date() },
        });
        return result.deletedCount ?? 0;
    },
};
//# sourceMappingURL=api-key.repository.js.map