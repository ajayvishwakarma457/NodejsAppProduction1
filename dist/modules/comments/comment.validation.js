"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commentIdParamSchema = exports.listCommentsQuerySchema = exports.updateCommentSchema = exports.createCommentSchema = void 0;
const zod_1 = require("zod");
/* ------------------------------------------------------------------ */
// Body schemas
/* ------------------------------------------------------------------ */
exports.createCommentSchema = zod_1.z.object({
    body: zod_1.z.object({
        taskId: zod_1.z.string().min(1, 'Task id is required'),
        content: zod_1.z.string().min(1, 'Content is required').max(5000),
        parentId: zod_1.z.string().min(1).optional(),
    }),
});
exports.updateCommentSchema = zod_1.z.object({
    body: zod_1.z.object({
        content: zod_1.z.string().min(1).max(5000),
    }),
    params: zod_1.z.object({
        id: zod_1.z.string().min(1, 'Comment id is required'),
    }),
});
/* ------------------------------------------------------------------ */
// Query / route param schemas
/* ------------------------------------------------------------------ */
exports.listCommentsQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.coerce.number().min(1).default(1),
        limit: zod_1.z.coerce.number().min(1).max(100).default(10),
        sort: zod_1.z.string().optional().default('createdAt'),
        order: zod_1.z.enum(['asc', 'desc']).optional().default('desc'),
        taskId: zod_1.z.string().min(1).optional(),
        userId: zod_1.z.string().min(1).optional(),
    }),
});
exports.commentIdParamSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1, 'Comment id is required'),
    }),
});
//# sourceMappingURL=comment.validation.js.map