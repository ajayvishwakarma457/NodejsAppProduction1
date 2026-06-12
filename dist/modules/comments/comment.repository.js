"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commentRepository = void 0;
const comment_model_1 = require("./comment.model");
const pagination_1 = require("../../utils/pagination");
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
        const [data, total] = await Promise.all([
            comment_model_1.CommentModel.find(query)
                .sort({ [options.sort]: sortDirection })
                .skip(skip)
                .limit(options.limit)
                .lean(),
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
        return comment_model_1.CommentModel.findById(id).lean();
    },
    /**
     * Find a comment by id with user details populated.
     */
    async findByIdWithUser(id) {
        return comment_model_1.CommentModel.findById(id).populate('userId', 'firstName lastName email avatar').lean();
    },
    /**
     * Find comments for a specific task.
     */
    async findByTaskId(taskId) {
        return comment_model_1.CommentModel.find({ taskId })
            .sort({ createdAt: -1 })
            .populate('userId', 'firstName lastName email avatar')
            .lean();
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
        return comment_model_1.CommentModel.findByIdAndUpdate(id, data, { new: true, session }).lean();
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
};
//# sourceMappingURL=comment.repository.js.map