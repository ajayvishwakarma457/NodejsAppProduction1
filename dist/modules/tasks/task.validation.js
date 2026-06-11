"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskIdParamSchema = exports.listTasksQuerySchema = exports.updateTaskSchema = exports.createTaskSchema = void 0;
const zod_1 = require("zod");
/* ------------------------------------------------------------------ */
// Body schemas
/* ------------------------------------------------------------------ */
exports.createTaskSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().min(1, 'Task title is required').max(200),
        description: zod_1.z.string().min(1, 'Task description is required').max(2000),
        priority: zod_1.z.enum(['low', 'medium', 'high', 'critical']).optional().default('medium'),
        status: zod_1.z.enum(['todo', 'in-progress', 'review', 'done']).optional().default('todo'),
        projectId: zod_1.z.string().min(1, 'Project id is required'),
        assignedTo: zod_1.z.string().min(1, 'Assignee id is required'),
        dueDate: zod_1.z.string().datetime().optional(),
        estimatedHours: zod_1.z.coerce.number().min(0).optional().default(0),
        actualHours: zod_1.z.coerce.number().min(0).optional().default(0),
    }),
});
exports.updateTaskSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().min(1).max(200).optional(),
        description: zod_1.z.string().min(1).max(2000).optional(),
        priority: zod_1.z.enum(['low', 'medium', 'high', 'critical']).optional(),
        status: zod_1.z.enum(['todo', 'in-progress', 'review', 'done']).optional(),
        projectId: zod_1.z.string().min(1).optional(),
        assignedTo: zod_1.z.string().min(1).optional(),
        dueDate: zod_1.z.string().datetime().optional(),
        estimatedHours: zod_1.z.coerce.number().min(0).optional(),
        actualHours: zod_1.z.coerce.number().min(0).optional(),
    }),
    params: zod_1.z.object({
        id: zod_1.z.string().min(1, 'Task id is required'),
    }),
});
/* ------------------------------------------------------------------ */
// Query / route param schemas
/* ------------------------------------------------------------------ */
exports.listTasksQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.coerce.number().min(1).default(1),
        limit: zod_1.z.coerce.number().min(1).max(100).default(10),
        sort: zod_1.z.string().optional().default('createdAt'),
        order: zod_1.z.enum(['asc', 'desc']).optional().default('desc'),
        projectId: zod_1.z.string().optional(),
        assignedTo: zod_1.z.string().optional(),
        createdBy: zod_1.z.string().optional(),
        status: zod_1.z.enum(['todo', 'in-progress', 'review', 'done']).optional(),
        priority: zod_1.z.enum(['low', 'medium', 'high', 'critical']).optional(),
        search: zod_1.z.string().optional(),
    }),
});
exports.taskIdParamSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1, 'Task id is required'),
    }),
});
//# sourceMappingURL=task.validation.js.map