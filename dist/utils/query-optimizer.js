"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildListProjection = exports.applyCursorPagination = exports.decodeCursor = exports.encodeCursor = exports.canUseTextSearch = exports.buildTextSearchFilter = exports.buildRegexSearchFilter = exports.timedQuery = exports.logSlowQuery = exports.withTimeout = exports.SLOW_QUERY_THRESHOLD_MS = exports.DEFAULT_QUERY_TIMEOUT_MS = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const logger_1 = require("../config/logger");
exports.DEFAULT_QUERY_TIMEOUT_MS = 5000;
exports.SLOW_QUERY_THRESHOLD_MS = 300;
/**
 * Apply a maximum execution time to a Mongoose query.
 * Prevents runaway queries from consuming database resources.
 */
const withTimeout = (query, ms = exports.DEFAULT_QUERY_TIMEOUT_MS) => {
    return query.maxTimeMS(ms);
};
exports.withTimeout = withTimeout;
/**
 * Log queries that exceed the slow query threshold.
 */
const logSlowQuery = (metrics) => {
    if (metrics.durationMs < exports.SLOW_QUERY_THRESHOLD_MS)
        return;
    logger_1.logger.warn('Slow query detected', {
        ...metrics,
        thresholdMs: exports.SLOW_QUERY_THRESHOLD_MS,
    });
};
exports.logSlowQuery = logSlowQuery;
/**
 * Wrap a Mongoose query execution with timing and slow-query logging.
 */
const timedQuery = async (query, options) => {
    const start = Date.now();
    const q = options.timeoutMs !== undefined ? (0, exports.withTimeout)(query, options.timeoutMs) : query;
    try {
        const result = await q.lean().exec();
        const durationMs = Date.now() - start;
        (0, exports.logSlowQuery)({
            collection: options.collection,
            operation: options.operation,
            durationMs,
            filter: q.getFilter?.(),
            count: Array.isArray(result) ? result.length : undefined,
        });
        return result;
    }
    catch (error) {
        const durationMs = Date.now() - start;
        logger_1.logger.error('Query failed', {
            collection: options.collection,
            operation: options.operation,
            durationMs,
            error,
        });
        throw error;
    }
};
exports.timedQuery = timedQuery;
/**
 * Build a regex-based case-insensitive search filter for the given fields.
 * Prefer text indexes for large collections; this helper is suitable for
 * smaller datasets or fields that need substring matching.
 */
const buildRegexSearchFilter = (search, fields) => {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = { $regex: escaped, $options: 'i' };
    return { $or: fields.map((field) => ({ [field]: regex })) };
};
exports.buildRegexSearchFilter = buildRegexSearchFilter;
/**
 * Build a MongoDB text search filter when a text index exists.
 */
const buildTextSearchFilter = (search) => {
    return { $text: { $search: search } };
};
exports.buildTextSearchFilter = buildTextSearchFilter;
/**
 * Determine whether a text search can be used. Requires the collection to
 * have a text index. Falls back to regex search when uncertain.
 */
const canUseTextSearch = async (collectionName) => {
    try {
        const db = mongoose_1.default.connection.db;
        if (!db)
            return false;
        const indexes = await db.collection(collectionName).indexes();
        return indexes.some((index) => index.key && Object.values(index.key).includes('text'));
    }
    catch {
        return false;
    }
};
exports.canUseTextSearch = canUseTextSearch;
/**
 * Encode a cursor for cursor-based pagination.
 */
const encodeCursor = (value) => {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
};
exports.encodeCursor = encodeCursor;
/**
 * Decode a cursor for cursor-based pagination.
 */
const decodeCursor = (cursor) => {
    try {
        return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf-8'));
    }
    catch {
        throw new Error('Invalid cursor');
    }
};
exports.decodeCursor = decodeCursor;
/**
 * Apply cursor-based pagination to a Mongoose query.
 * The cursor must contain the sort field value and `_id` for tie-breaking.
 */
const applyCursorPagination = async (query, input, sortField = 'createdAt') => {
    const limit = Math.min(Math.max(input.limit ?? 10, 1), 100);
    const order = input.order === 'asc' ? 1 : -1;
    const sort = input.sort ?? sortField;
    if (input.cursor) {
        const cursor = (0, exports.decodeCursor)(input.cursor);
        const sortValue = cursor[sort];
        const idValue = cursor._id;
        query = query.find({
            $or: [
                { [sort]: order === 1 ? { $gt: sortValue } : { $lt: sortValue } },
                {
                    [sort]: sortValue,
                    _id: order === 1 ? { $gt: idValue } : { $lt: idValue },
                },
            ],
        });
    }
    query = query.sort({ [sort]: order, _id: order }).limit(limit + 1);
    const results = (await query.lean().exec());
    const hasMore = results.length > limit;
    const data = hasMore ? results.slice(0, -1) : results;
    let nextCursor = null;
    if (hasMore && data.length > 0) {
        const last = data[data.length - 1];
        nextCursor = (0, exports.encodeCursor)({
            [sort]: last[sort],
            _id: last._id,
        });
    }
    return { data, nextCursor, hasMore };
};
exports.applyCursorPagination = applyCursorPagination;
/**
 * Recommend a projection that covers common list endpoints.
 * Removes heavy or sensitive fields by default.
 */
const buildListProjection = (excludedFields = []) => {
    const defaults = ['__v'];
    const all = Array.from(new Set([...defaults, ...excludedFields]));
    return all.reduce((acc, field) => ({ ...acc, [field]: 0 }), {});
};
exports.buildListProjection = buildListProjection;
//# sourceMappingURL=query-optimizer.js.map