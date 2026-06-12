"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectIdParamSchema = exports.dashboardProjectsQuerySchema = exports.listProjectsQuerySchema = exports.updateProjectSchema = exports.createProjectSchema = void 0;
const zod_1 = require("zod");
/* ------------------------------------------------------------------ */
// Body schemas
/* ------------------------------------------------------------------ */
exports.createProjectSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, 'Project name is required').max(100),
        description: zod_1.z.string().min(1, 'Description is required').max(1000),
        status: zod_1.z.enum(['active', 'completed', 'archived']).optional(),
        teamId: zod_1.z.string().min(1, 'Team id is required'),
        startDate: zod_1.z.string().datetime().optional().or(zod_1.z.date().optional()),
        dueDate: zod_1.z.string().datetime().optional().or(zod_1.z.date().optional()),
    }),
});
exports.updateProjectSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1).max(100).optional(),
        description: zod_1.z.string().min(1).max(1000).optional(),
        status: zod_1.z.enum(['active', 'completed', 'archived']).optional(),
        teamId: zod_1.z.string().min(1).optional(),
        startDate: zod_1.z.string().datetime().optional().or(zod_1.z.date().optional()),
        dueDate: zod_1.z.string().datetime().optional().or(zod_1.z.date().optional()),
    }),
    params: zod_1.z.object({
        id: zod_1.z.string().min(1, 'Project id is required'),
    }),
});
/* ------------------------------------------------------------------ */
// Query / route param schemas
/* ------------------------------------------------------------------ */
exports.listProjectsQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.coerce.number().min(1).default(1),
        limit: zod_1.z.coerce.number().min(1).max(100).default(10),
        sort: zod_1.z.string().optional().default('createdAt'),
        order: zod_1.z.enum(['asc', 'desc']).optional().default('desc'),
        status: zod_1.z.enum(['active', 'completed', 'archived']).optional(),
        ownerId: zod_1.z.string().optional(),
        teamId: zod_1.z.string().optional(),
        search: zod_1.z.string().optional(),
    }),
});
exports.dashboardProjectsQuerySchema = zod_1.z.object({
    query: zod_1.z.object({}),
});
exports.projectIdParamSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1, 'Project id is required'),
    }),
});
//# sourceMappingURL=project.validation.js.map