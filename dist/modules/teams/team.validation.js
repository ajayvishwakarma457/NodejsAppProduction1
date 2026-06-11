"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeMemberSchema = exports.addMemberSchema = exports.teamIdParamSchema = exports.listTeamsQuerySchema = exports.updateTeamSchema = exports.createTeamSchema = void 0;
const zod_1 = require("zod");
/* ------------------------------------------------------------------ */
// Body schemas
/* ------------------------------------------------------------------ */
exports.createTeamSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, 'Team name is required').max(100),
        description: zod_1.z.string().min(1, 'Team description is required').max(500),
    }),
});
exports.updateTeamSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1).max(100).optional(),
        description: zod_1.z.string().min(1).max(500).optional(),
    }),
    params: zod_1.z.object({
        id: zod_1.z.string().min(1, 'Team id is required'),
    }),
});
/* ------------------------------------------------------------------ */
// Query / route param schemas
/* ------------------------------------------------------------------ */
exports.listTeamsQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.coerce.number().min(1).default(1),
        limit: zod_1.z.coerce.number().min(1).max(100).default(10),
        sort: zod_1.z.string().optional().default('createdAt'),
        order: zod_1.z.enum(['asc', 'desc']).optional().default('desc'),
        ownerId: zod_1.z.string().optional(),
        memberId: zod_1.z.string().optional(),
        search: zod_1.z.string().optional(),
    }),
});
exports.teamIdParamSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1, 'Team id is required'),
    }),
});
/* ------------------------------------------------------------------ */
// Member operation schemas
/* ------------------------------------------------------------------ */
exports.addMemberSchema = zod_1.z.object({
    body: zod_1.z.object({
        userId: zod_1.z.string().min(1, 'User id is required'),
        role: zod_1.z.enum(['owner', 'admin', 'member']).optional().default('member'),
    }),
    params: zod_1.z.object({
        id: zod_1.z.string().min(1, 'Team id is required'),
    }),
});
exports.removeMemberSchema = zod_1.z.object({
    body: zod_1.z.object({
        userId: zod_1.z.string().min(1, 'User id is required'),
    }),
    params: zod_1.z.object({
        id: zod_1.z.string().min(1, 'Team id is required'),
    }),
});
//# sourceMappingURL=team.validation.js.map