"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commentService = void 0;
const ApiError_1 = require("../../utils/ApiError");
const pagination_1 = require("../../utils/pagination");
const comment_repository_1 = require("./comment.repository");
exports.commentService = {
    async list(query) {
        const pagination = (0, pagination_1.getPagination)(query.page, query.limit, query.sort, query.order);
        const filter = {};
        if (query.taskId) {
            filter.taskId = String(query.taskId);
        }
        if (query.userId) {
            filter.userId = String(query.userId);
        }
        return comment_repository_1.commentRepository.findAll({
            page: pagination.page,
            limit: pagination.limit,
            sort: pagination.sort,
            order: pagination.order,
        }, filter);
    },
    async getById(id) {
        return comment_repository_1.commentRepository.findByIdWithUser(id);
    },
    async create(data, userId) {
        return comment_repository_1.commentRepository.create({
            ...data,
            userId,
        });
    },
    async update(id, data, userId) {
        const comment = await comment_repository_1.commentRepository.findById(id);
        if (!comment) {
            throw ApiError_1.ApiError.notFound('Comment not found');
        }
        if (String(comment.userId) !== userId) {
            throw ApiError_1.ApiError.forbidden('You can only update your own comments');
        }
        return comment_repository_1.commentRepository.updateById(id, data);
    },
    async remove(id, userId) {
        const comment = await comment_repository_1.commentRepository.findById(id);
        if (!comment) {
            throw ApiError_1.ApiError.notFound('Comment not found');
        }
        if (String(comment.userId) !== userId) {
            throw ApiError_1.ApiError.forbidden('You can only delete your own comments');
        }
        return comment_repository_1.commentRepository.deleteById(id);
    },
};
//# sourceMappingURL=comment.service.js.map