"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRepository = void 0;
const user_model_1 = require("./user.model");
const pagination_1 = require("../../utils/pagination");
const query_optimizer_1 = require("../../utils/query-optimizer");
/* ------------------------------------------------------------------ */
// Helpers
/* ------------------------------------------------------------------ */
const buildFilterQuery = (filter) => {
    const query = {};
    if (filter.role) {
        query.role = filter.role;
    }
    if (filter.isVerified !== undefined) {
        query.isVerified = filter.isVerified;
    }
    if (filter.search) {
        const searchRegex = { $regex: filter.search, $options: 'i' };
        query.$or = [{ firstName: searchRegex }, { lastName: searchRegex }, { email: searchRegex }];
    }
    return query;
};
/* ------------------------------------------------------------------ */
// Repository
/* ------------------------------------------------------------------ */
exports.userRepository = {
    /**
     * Find all users with pagination, sorting, and optional filtering.
     */
    async findAll(options, filter = {}) {
        const query = buildFilterQuery(filter);
        const skip = (options.page - 1) * options.limit;
        const sortDirection = options.order === 'desc' ? -1 : 1;
        const listQuery = user_model_1.UserModel.find(query)
            .sort({ [options.sort]: sortDirection })
            .skip(skip)
            .limit(options.limit)
            .select((0, query_optimizer_1.buildListProjection)(['password', 'refreshToken']))
            .lean();
        const [data, total] = await Promise.all([
            (0, query_optimizer_1.timedQuery)(listQuery, { collection: 'users', operation: 'findAll' }),
            user_model_1.UserModel.countDocuments(query),
        ]);
        return {
            data,
            meta: (0, pagination_1.buildPaginationMeta)(options.page, options.limit, total),
        };
    },
    /**
     * Find a user by their MongoDB _id.
     */
    async findById(id) {
        const query = user_model_1.UserModel.findById(id)
            .select((0, query_optimizer_1.buildListProjection)(['password', 'refreshToken']))
            .lean();
        return (0, query_optimizer_1.timedQuery)(query, { collection: 'users', operation: 'findById' });
    },
    /**
     * Find a user by email (case-insensitive, trimmed).
     * Excludes password and refreshToken by default.
     */
    async findByEmail(email) {
        const query = user_model_1.UserModel.findOne({ email: email.toLowerCase().trim() })
            .select((0, query_optimizer_1.buildListProjection)(['password', 'refreshToken']))
            .lean();
        return (0, query_optimizer_1.timedQuery)(query, { collection: 'users', operation: 'findByEmail' });
    },
    /**
     * Find a user by email and explicitly include sensitive fields
     * (password + refreshToken). Intended for authentication flows.
     */
    async findByEmailWithPassword(email) {
        const query = user_model_1.UserModel.findOne({ email: email.toLowerCase().trim() })
            .select('+password +refreshToken')
            .lean();
        return (0, query_optimizer_1.timedQuery)(query, { collection: 'users', operation: 'findByEmailWithPassword' });
    },
    /**
     * Find a user by OAuth provider and providerId.
     */
    async findByProvider(provider, providerId) {
        const query = user_model_1.UserModel.findOne({ provider, providerId })
            .select((0, query_optimizer_1.buildListProjection)(['password', 'refreshToken']))
            .lean();
        return (0, query_optimizer_1.timedQuery)(query, { collection: 'users', operation: 'findByProvider' });
    },
    /**
     * Create a new user document.
     */
    async create(data, session) {
        const doc = new user_model_1.UserModel(data);
        return doc.save({ session });
    },
    /**
     * Update a user by id. Returns the updated document or null if not found.
     */
    async updateById(id, data, session) {
        const query = user_model_1.UserModel.findByIdAndUpdate(id, data, { new: true, session })
            .select((0, query_optimizer_1.buildListProjection)(['password', 'refreshToken']))
            .lean();
        return (0, query_optimizer_1.timedQuery)(query, { collection: 'users', operation: 'updateById' });
    },
    /**
     * Delete a user by id. Returns true if a document was deleted.
     */
    async deleteById(id, session) {
        const result = await user_model_1.UserModel.findByIdAndDelete(id, { session });
        return result !== null;
    },
    /**
     * Delete multiple users matching a filter.
     */
    async deleteMany(filter, session) {
        const result = await user_model_1.UserModel.deleteMany(filter, { session });
        return result.deletedCount ?? 0;
    },
    /**
     * Check whether a user with the given id exists.
     */
    async exists(id) {
        const doc = await user_model_1.UserModel.exists({ _id: id });
        return doc !== null;
    },
    /**
     * Count users matching the given filter.
     */
    async count(filter = {}) {
        return user_model_1.UserModel.countDocuments(buildFilterQuery(filter));
    },
    /**
     * Update the lastLogin timestamp for a user.
     */
    async updateLastLogin(id) {
        await user_model_1.UserModel.findByIdAndUpdate(id, { lastLogin: new Date() });
    },
};
//# sourceMappingURL=user.repository.js.map