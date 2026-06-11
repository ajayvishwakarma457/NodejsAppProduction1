"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userIdParamSchema = exports.listUsersQuerySchema = exports.updateUserSchema = exports.createUserSchema = void 0;
const zod_1 = require("zod");
/* ------------------------------------------------------------------ */
// Body schemas
/* ------------------------------------------------------------------ */
exports.createUserSchema = zod_1.z.object({
    body: zod_1.z.object({
        firstName: zod_1.z.string().min(1, 'First name is required').max(50),
        lastName: zod_1.z.string().min(1, 'Last name is required').max(50),
        email: zod_1.z.string().email('Please provide a valid email'),
        password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
        role: zod_1.z.enum(['admin', 'manager', 'member']).optional(),
        avatar: zod_1.z.string().optional(),
    }),
});
exports.updateUserSchema = zod_1.z.object({
    body: zod_1.z.object({
        firstName: zod_1.z.string().min(1).max(50).optional(),
        lastName: zod_1.z.string().min(1).max(50).optional(),
        email: zod_1.z.string().email().optional(),
        role: zod_1.z.enum(['admin', 'manager', 'member']).optional(),
        avatar: zod_1.z.string().optional(),
    }),
    params: zod_1.z.object({
        id: zod_1.z.string().min(1, 'User id is required'),
    }),
});
/* ------------------------------------------------------------------ */
// Query / route param schemas
/* ------------------------------------------------------------------ */
exports.listUsersQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.coerce.number().min(1).default(1),
        limit: zod_1.z.coerce.number().min(1).max(100).default(10),
        sort: zod_1.z.string().optional().default('createdAt'),
        order: zod_1.z.enum(['asc', 'desc']).optional().default('desc'),
        role: zod_1.z.enum(['admin', 'manager', 'member']).optional(),
        isVerified: zod_1.z
            .enum(['true', 'false'])
            .transform((val) => val === 'true')
            .optional(),
        search: zod_1.z.string().optional(),
    }),
});
exports.userIdParamSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().min(1, 'User id is required'),
    }),
});
//# sourceMappingURL=user.validation.js.map