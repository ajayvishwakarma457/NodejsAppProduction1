"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommentModel = void 0;
const mongoose_1 = require("mongoose");
const commentSchema = new mongoose_1.Schema({
    taskId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    parentId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Comment', default: null, index: true },
    content: { type: String, required: true, trim: true, maxlength: 5000 },
}, {
    timestamps: true,
});
commentSchema.index({ createdAt: -1 });
commentSchema.index({ taskId: 1, createdAt: -1 });
exports.CommentModel = (0, mongoose_1.model)('Comment', commentSchema);
//# sourceMappingURL=comment.model.js.map