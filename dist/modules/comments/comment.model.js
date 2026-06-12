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
commentSchema.index({ createdAt: -1 }, { name: 'comment_createdat_desc_idx' });
commentSchema.index({ taskId: 1, createdAt: -1 }, { name: 'comment_task_createdat_idx' });
// Text index for comment content search.
commentSchema.index({ content: 'text' }, { name: 'comment_text_search_idx' });
// Compound index for user activity feeds.
commentSchema.index({ userId: 1, createdAt: -1 }, { name: 'user_createdat_idx' });
// Compound index for nested comment threads.
commentSchema.index({ taskId: 1, parentId: 1, createdAt: -1 }, { name: 'task_parent_createdat_idx' });
exports.CommentModel = (0, mongoose_1.model)('Comment', commentSchema);
//# sourceMappingURL=comment.model.js.map