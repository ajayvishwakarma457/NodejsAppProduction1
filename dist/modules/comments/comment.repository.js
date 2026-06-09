"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commentRepository = void 0;
const comment_model_1 = require("./comment.model");
exports.commentRepository = {
    async findAll() {
        return comment_model_1.CommentModel.find().lean();
    }
};
