"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commentController = void 0;
const comment_service_1 = require("./comment.service");
exports.commentController = {
    async list(_req, res) {
        const comments = await comment_service_1.commentService.list();
        res.json({ success: true, data: comments });
    }
};
