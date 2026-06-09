"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commentService = void 0;
const comment_repository_1 = require("./comment.repository");
exports.commentService = {
    async list() {
        return comment_repository_1.commentRepository.findAll();
    }
};
