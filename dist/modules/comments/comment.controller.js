"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commentController = void 0;
const http_status_codes_1 = require("http-status-codes");
const comment_service_1 = require("./comment.service");
const ApiResponse_1 = require("../../utils/ApiResponse");
exports.commentController = {
    async list(req, res) {
        const { data, meta } = await comment_service_1.commentService.list(req.query);
        ApiResponse_1.ApiResponse.paginated(data, meta).send(res);
    },
    async getById(req, res) {
        const comment = await comment_service_1.commentService.getById(req.params.id);
        if (!comment) {
            res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Comment not found',
            });
            return;
        }
        ApiResponse_1.ApiResponse.ok(comment).send(res);
    },
    async create(req, res) {
        const userId = req.user.id;
        const comment = await comment_service_1.commentService.create(req.body, userId);
        ApiResponse_1.ApiResponse.created(comment, 'Comment created').send(res);
    },
    async update(req, res) {
        const userId = req.user.id;
        const comment = await comment_service_1.commentService.update(req.params.id, req.body, userId);
        if (!comment) {
            res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Comment not found',
            });
            return;
        }
        ApiResponse_1.ApiResponse.ok(comment, 'Comment updated').send(res);
    },
    async remove(req, res) {
        const userId = req.user.id;
        const deleted = await comment_service_1.commentService.remove(req.params.id, userId);
        if (!deleted) {
            res.status(http_status_codes_1.StatusCodes.NOT_FOUND).json({
                success: false,
                message: 'Comment not found',
            });
            return;
        }
        ApiResponse_1.ApiResponse.noContent('Comment deleted').send(res);
    },
};
//# sourceMappingURL=comment.controller.js.map