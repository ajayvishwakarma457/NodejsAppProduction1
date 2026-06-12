"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIndexHealthReport = exports.checkRecommendedIndexes = exports.getMissingIndexRecommendations = exports.ensureModelIndexes = exports.listAllIndexes = exports.listCollectionIndexes = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const logger_1 = require("../config/logger");
/**
 * List all indexes for a given collection.
 */
const listCollectionIndexes = async (collectionName) => {
    const db = mongoose_1.default.connection.db;
    if (!db) {
        throw new Error('Database connection not available');
    }
    const rawIndexes = await db.collection(collectionName).indexes();
    return rawIndexes.map((idx) => ({
        name: idx.name ?? 'unknown',
        key: idx.key,
        unique: idx.unique,
        sparse: idx.sparse,
        expireAfterSeconds: idx.expireAfterSeconds,
    }));
};
exports.listCollectionIndexes = listCollectionIndexes;
/**
 * List indexes for all collections in the current database.
 */
const listAllIndexes = async () => {
    const db = mongoose_1.default.connection.db;
    if (!db) {
        throw new Error('Database connection not available');
    }
    const collections = await db.listCollections().toArray();
    const results = [];
    for (const collection of collections) {
        try {
            const indexes = await (0, exports.listCollectionIndexes)(collection.name);
            results.push({
                collection: collection.name,
                indexCount: indexes.length,
                indexes,
                ready: true,
            });
        }
        catch (error) {
            results.push({
                collection: collection.name,
                indexCount: 0,
                indexes: [],
                ready: false,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
    return results;
};
exports.listAllIndexes = listAllIndexes;
/**
 * Ensure Mongoose model indexes are built.
 * Call this once at startup or via a maintenance job.
 */
const ensureModelIndexes = async () => {
    for (const model of mongoose_1.default.modelNames()) {
        try {
            await mongoose_1.default.model(model).syncIndexes();
            logger_1.logger.info(`Synced indexes for model: ${model}`);
        }
        catch (error) {
            logger_1.logger.error(`Failed to sync indexes for model: ${model}`, { error });
        }
    }
};
exports.ensureModelIndexes = ensureModelIndexes;
/**
 * Heuristic recommendations for missing indexes based on common query patterns.
 * This is a starting point; use MongoDB profiling and $indexStats for real-world tuning.
 */
const getMissingIndexRecommendations = () => {
    const recommendations = [
        {
            collection: 'users',
            field: 'email',
            reason: 'Login and uniqueness checks',
            suggestedIndex: { email: 1 },
        },
        {
            collection: 'teams',
            field: 'ownerId + members.userId',
            reason: 'Team ownership and membership lookups',
            suggestedIndex: { ownerId: 1, 'members.userId': 1 },
        },
        {
            collection: 'projects',
            field: 'teamId + status',
            reason: 'Team project dashboards filtered by status',
            suggestedIndex: { teamId: 1, status: 1 },
        },
        {
            collection: 'tasks',
            field: 'assignedTo + status + priority',
            reason: 'User task boards with status/priority filters',
            suggestedIndex: { assignedTo: 1, status: 1, priority: 1 },
        },
        {
            collection: 'comments',
            field: 'taskId + createdAt',
            reason: 'Task comment threads',
            suggestedIndex: { taskId: 1, createdAt: -1 },
        },
        {
            collection: 'notifications',
            field: 'userId + isRead + createdAt',
            reason: 'User notification feeds',
            suggestedIndex: { userId: 1, isRead: 1, createdAt: -1 },
        },
        {
            collection: 'apikeys',
            field: 'publicId',
            reason: 'API key validation',
            suggestedIndex: { publicId: 1 },
        },
    ];
    return recommendations;
};
exports.getMissingIndexRecommendations = getMissingIndexRecommendations;
/**
 * Check whether the recommended indexes exist.
 */
const checkRecommendedIndexes = async () => {
    const recommendations = (0, exports.getMissingIndexRecommendations)();
    const missing = [];
    for (const rec of recommendations) {
        try {
            const indexes = await (0, exports.listCollectionIndexes)(rec.collection);
            const hasIndex = indexes.some((idx) => {
                const keys = Object.keys(idx.key);
                const suggestedKeys = Object.keys(rec.suggestedIndex);
                if (keys.length < suggestedKeys.length)
                    return false;
                return suggestedKeys.every((k) => idx.key[k] === rec.suggestedIndex[k]);
            });
            if (!hasIndex) {
                missing.push(rec);
            }
        }
        catch {
            missing.push(rec);
        }
    }
    return missing;
};
exports.checkRecommendedIndexes = checkRecommendedIndexes;
/**
 * Get a high-level index health report.
 */
const getIndexHealthReport = async () => {
    const collections = await (0, exports.listAllIndexes)();
    const missingRecommendations = await (0, exports.checkRecommendedIndexes)();
    const healthy = collections.every((c) => c.ready) && missingRecommendations.length === 0;
    return {
        healthy,
        collections,
        missingRecommendations,
    };
};
exports.getIndexHealthReport = getIndexHealthReport;
//# sourceMappingURL=index-manager.js.map