"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commentRepository = void 0;
const mongoose_1 = require("mongoose");
const comment_model_1 = require("./comment.model");
const pagination_1 = require("../../utils/pagination");
const query_optimizer_1 = require("../../utils/query-optimizer");
const aggregation_1 = require("../../utils/aggregation");
/* ------------------------------------------------------------------ */
// Helpers
/* ------------------------------------------------------------------ */
const buildFilterQuery = (filter) => {
    const query = {};
    if (filter.taskId) {
        query.taskId = filter.taskId;
    }
    if (filter.userId) {
        query.userId = filter.userId;
    }
    return query;
};
/* ------------------------------------------------------------------ */
// Repository
/* ------------------------------------------------------------------ */
exports.commentRepository = {
    /**
     * Find all comments with pagination, sorting, and optional filtering.
     */
    async findAll(options, filter = {}) {
        const query = buildFilterQuery(filter);
        const skip = (options.page - 1) * options.limit;
        const sortDirection = options.order === 'desc' ? -1 : 1;
        const listQuery = comment_model_1.CommentModel.find(query)
            .sort({ [options.sort]: sortDirection })
            .skip(skip)
            .limit(options.limit)
            .select((0, query_optimizer_1.buildListProjection)())
            .lean();
        const [data, total] = await Promise.all([
            (0, query_optimizer_1.timedQuery)(listQuery, { collection: 'comments', operation: 'findAll' }),
            comment_model_1.CommentModel.countDocuments(query),
        ]);
        return {
            data,
            meta: (0, pagination_1.buildPaginationMeta)(options.page, options.limit, total),
        };
    },
    /**
     * Find a comment by its MongoDB _id.
     */
    async findById(id) {
        const query = comment_model_1.CommentModel.findById(id).select((0, query_optimizer_1.buildListProjection)()).lean();
        return (0, query_optimizer_1.timedQuery)(query, { collection: 'comments', operation: 'findById' });
    },
    /**
     * Find a comment by id with user details populated.
     */
    async findByIdWithUser(id) {
        const query = comment_model_1.CommentModel.findById(id)
            .populate('userId', 'firstName lastName email avatar')
            .lean();
        return (0, query_optimizer_1.timedQuery)(query, { collection: 'comments', operation: 'findByIdWithUser' });
    },
    /**
     * Find comments for a specific task.
     */
    async findByTaskId(taskId) {
        const query = comment_model_1.CommentModel.find({ taskId })
            .sort({ createdAt: -1 })
            .populate('userId', 'firstName lastName email avatar')
            .select((0, query_optimizer_1.buildListProjection)())
            .lean();
        return (0, query_optimizer_1.timedQuery)(query, { collection: 'comments', operation: 'findByTaskId' });
    },
    /**
     * Create a new comment document.
     */
    async create(data, session) {
        const doc = new comment_model_1.CommentModel(data);
        return doc.save({ session });
    },
    /**
     * Update a comment by id. Returns the updated document or null.
     */
    async updateById(id, data, session) {
        const query = comment_model_1.CommentModel.findByIdAndUpdate(id, data, { new: true, session })
            .select((0, query_optimizer_1.buildListProjection)())
            .lean();
        return (0, query_optimizer_1.timedQuery)(query, { collection: 'comments', operation: 'updateById' });
    },
    /**
     * Delete a comment by id. Returns true if a document was deleted.
     */
    async deleteById(id, session) {
        const result = await comment_model_1.CommentModel.findByIdAndDelete(id, { session });
        return result !== null;
    },
    /**
     * Delete multiple comments matching a filter.
     */
    async deleteMany(filter, session) {
        const result = await comment_model_1.CommentModel.deleteMany(filter, { session });
        return result.deletedCount ?? 0;
    },
    /**
     * Check whether a comment with the given id exists.
     */
    async exists(id) {
        const doc = await comment_model_1.CommentModel.exists({ _id: id });
        return doc !== null;
    },
    /* ------------------------------------------------------------------ */
    // Aggregations
    /* ------------------------------------------------------------------ */
    /**
     * Comment counts per task.
     */
    async getCountsByTask(taskIds) {
        const match = {};
        if (taskIds && taskIds.length > 0) {
            match.taskId = { $in: taskIds.map((id) => new mongoose_1.Types.ObjectId(id)) };
        }
        const pipeline = [
            { $match: match },
            { $group: { _id: '$taskId', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ];
        return (0, aggregation_1.timedAggregate)(comment_model_1.CommentModel, pipeline, {
            operation: 'getCountsByTask',
        });
    },
};
//# sourceMappingURL=comment.repository.js.map