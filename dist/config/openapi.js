"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.openApiDocument = void 0;
const zod_to_openapi_1 = require("@asteasolutions/zod-to-openapi");
const zod_1 = require("zod");
const env_1 = require("./env");
(0, zod_to_openapi_1.extendZodWithOpenApi)(zod_1.z);
/* ------------------------------------------------------------------ */
// Registry
/* ------------------------------------------------------------------ */
const registry = new zod_to_openapi_1.OpenAPIRegistry();
/* ------------------------------------------------------------------ */
// Parameter helpers
/* ------------------------------------------------------------------ */
const idParam = registry.registerParameter('Id', zod_1.z.string().openapi({
    param: {
        name: 'id',
        in: 'path',
        required: true,
        description: 'MongoDB document id',
    },
    example: '507f1f77bcf86cd799439011',
}));
const paginationQuery = {
    page: zod_1.z.coerce
        .number()
        .min(1)
        .optional()
        .openapi({
        param: { name: 'page', in: 'query', description: 'Page number' },
        example: 1,
    }),
    limit: zod_1.z.coerce
        .number()
        .min(1)
        .max(100)
        .optional()
        .openapi({
        param: { name: 'limit', in: 'query', description: 'Items per page' },
        example: 10,
    }),
    sort: zod_1.z
        .string()
        .optional()
        .openapi({
        param: { name: 'sort', in: 'query', description: 'Field to sort by' },
        example: 'createdAt',
    }),
    order: zod_1.z
        .enum(['asc', 'desc'])
        .optional()
        .openapi({
        param: { name: 'order', in: 'query', description: 'Sort order' },
        example: 'desc',
    }),
};
/* ------------------------------------------------------------------ */
// Common schemas
/* ------------------------------------------------------------------ */
const ApiErrorSchema = registry.register('ApiError', zod_1.z
    .object({
    success: zod_1.z.boolean().openapi({ example: false }),
    message: zod_1.z.string().openapi({ example: 'Bad request' }),
    requestId: zod_1.z.string().openapi({ example: 'a1b2c3d4' }),
    details: zod_1.z.unknown().optional(),
    stack: zod_1.z.string().optional(),
})
    .openapi('ApiError'));
const PaginationMetaSchema = registry.register('PaginationMeta', zod_1.z
    .object({
    page: zod_1.z.number().openapi({ example: 1 }),
    limit: zod_1.z.number().openapi({ example: 10 }),
    total: zod_1.z.number().openapi({ example: 42 }),
    totalPages: zod_1.z.number().openapi({ example: 5 }),
})
    .openapi('PaginationMeta'));
const UserSchema = registry.register('User', zod_1.z
    .object({
    id: zod_1.z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
    firstName: zod_1.z.string().openapi({ example: 'Jane' }),
    lastName: zod_1.z.string().openapi({ example: 'Doe' }),
    email: zod_1.z.string().email().openapi({ example: 'jane@example.com' }),
    role: zod_1.z.enum(['admin', 'manager', 'member']).openapi({ example: 'member' }),
    isVerified: zod_1.z.boolean().openapi({ example: true }),
    avatar: zod_1.z.string().nullable().openapi({ example: 'https://example.com/avatar.png' }),
    provider: zod_1.z.enum(['local', 'google', 'github']).openapi({ example: 'local' }),
    createdAt: zod_1.z.string().datetime().openapi({ example: '2024-01-01T00:00:00.000Z' }),
    updatedAt: zod_1.z.string().datetime().openapi({ example: '2024-01-01T00:00:00.000Z' }),
})
    .openapi('User'));
const TeamMemberSchema = registry.register('TeamMember', zod_1.z
    .object({
    userId: zod_1.z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
    role: zod_1.z.enum(['owner', 'admin', 'member']).openapi({ example: 'member' }),
    joinedAt: zod_1.z.string().datetime().openapi({ example: '2024-01-01T00:00:00.000Z' }),
})
    .openapi('TeamMember'));
const TeamSchema = registry.register('Team', zod_1.z
    .object({
    id: zod_1.z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
    name: zod_1.z.string().openapi({ example: 'Engineering' }),
    description: zod_1.z.string().openapi({ example: 'The engineering team' }),
    ownerId: zod_1.z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
    members: zod_1.z.array(TeamMemberSchema).openapi({ example: [] }),
    createdAt: zod_1.z.string().datetime().openapi({ example: '2024-01-01T00:00:00.000Z' }),
    updatedAt: zod_1.z.string().datetime().openapi({ example: '2024-01-01T00:00:00.000Z' }),
})
    .openapi('Team'));
const ProjectSchema = registry.register('Project', zod_1.z
    .object({
    id: zod_1.z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
    name: zod_1.z.string().openapi({ example: 'Website redesign' }),
    description: zod_1.z.string().openapi({ example: 'Redesign the public website' }),
    status: zod_1.z.enum(['active', 'completed', 'archived']).openapi({ example: 'active' }),
    ownerId: zod_1.z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
    teamId: zod_1.z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
    startDate: zod_1.z.string().datetime().nullable().openapi({ example: null }),
    dueDate: zod_1.z.string().datetime().nullable().openapi({ example: '2024-06-01T00:00:00.000Z' }),
    createdAt: zod_1.z.string().datetime().openapi({ example: '2024-01-01T00:00:00.000Z' }),
    updatedAt: zod_1.z.string().datetime().openapi({ example: '2024-01-01T00:00:00.000Z' }),
})
    .openapi('Project'));
const TaskSchema = registry.register('Task', zod_1.z
    .object({
    id: zod_1.z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
    title: zod_1.z.string().openapi({ example: 'Fix login bug' }),
    description: zod_1.z.string().openapi({ example: 'Users cannot log in with Google' }),
    priority: zod_1.z.enum(['low', 'medium', 'high', 'critical']).openapi({ example: 'high' }),
    status: zod_1.z.enum(['todo', 'in-progress', 'review', 'done']).openapi({ example: 'in-progress' }),
    projectId: zod_1.z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
    createdBy: zod_1.z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
    assignedTo: zod_1.z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
    dueDate: zod_1.z.string().datetime().nullable().openapi({ example: '2024-06-01T00:00:00.000Z' }),
    estimatedHours: zod_1.z.number().openapi({ example: 4 }),
    actualHours: zod_1.z.number().openapi({ example: 2 }),
    createdAt: zod_1.z.string().datetime().openapi({ example: '2024-01-01T00:00:00.000Z' }),
    updatedAt: zod_1.z.string().datetime().openapi({ example: '2024-01-01T00:00:00.000Z' }),
})
    .openapi('Task'));
const CommentSchema = registry.register('Comment', zod_1.z
    .object({
    id: zod_1.z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
    taskId: zod_1.z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
    userId: zod_1.z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
    parentId: zod_1.z.string().nullable().openapi({ example: null }),
    content: zod_1.z.string().openapi({ example: 'Looks good to me' }),
    createdAt: zod_1.z.string().datetime().openapi({ example: '2024-01-01T00:00:00.000Z' }),
    updatedAt: zod_1.z.string().datetime().openapi({ example: '2024-01-01T00:00:00.000Z' }),
})
    .openapi('Comment'));
const NotificationSchema = registry.register('Notification', zod_1.z
    .object({
    id: zod_1.z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
    userId: zod_1.z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
    title: zod_1.z.string().openapi({ example: 'Task assigned' }),
    message: zod_1.z.string().openapi({ example: 'You have been assigned to Fix login bug' }),
    type: zod_1.z
        .enum([
        'task-assigned',
        'task-updated',
        'comment-added',
        'project-created',
        'mention',
        'due-soon',
        'invite',
    ])
        .openapi({ example: 'task-assigned' }),
    channels: zod_1.z.array(zod_1.z.enum(['in-app', 'email', 'socket'])).openapi({ example: ['in-app'] }),
    isRead: zod_1.z.boolean().openapi({ example: false }),
    status: zod_1.z.enum(['pending', 'delivered', 'failed']).openapi({ example: 'pending' }),
    createdAt: zod_1.z.string().datetime().openapi({ example: '2024-01-01T00:00:00.000Z' }),
    updatedAt: zod_1.z.string().datetime().openapi({ example: '2024-01-01T00:00:00.000Z' }),
})
    .openapi('Notification'));
const ApiKeySchema = registry.register('ApiKey', zod_1.z
    .object({
    id: zod_1.z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
    userId: zod_1.z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
    name: zod_1.z.string().openapi({ example: 'CI deployment key' }),
    publicId: zod_1.z.string().openapi({ example: 'npak_a1b2c3d4' }),
    keyPrefix: zod_1.z.string().openapi({ example: 'npak' }),
    role: zod_1.z.enum(['admin', 'manager', 'member']).openapi({ example: 'member' }),
    scopes: zod_1.z.array(zod_1.z.enum(['read', 'write', 'admin'])).openapi({ example: ['read', 'write'] }),
    expiresAt: zod_1.z.string().datetime().openapi({ example: '2025-01-01T00:00:00.000Z' }),
    isActive: zod_1.z.boolean().openapi({ example: true }),
    createdAt: zod_1.z.string().datetime().openapi({ example: '2024-01-01T00:00:00.000Z' }),
    updatedAt: zod_1.z.string().datetime().openapi({ example: '2024-01-01T00:00:00.000Z' }),
})
    .openapi('ApiKey'));
const TokenPairSchema = registry.register('TokenPair', zod_1.z
    .object({
    accessToken: zod_1.z.string().openapi({
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    }),
    refreshToken: zod_1.z.string().openapi({ example: 'refresh-token-string' }),
})
    .openapi('TokenPair'));
const HealthCheckSchema = registry.register('HealthCheck', zod_1.z
    .object({
    success: zod_1.z.boolean().openapi({ example: true }),
    message: zod_1.z.string().openapi({ example: 'OK' }),
    checks: zod_1.z
        .record(zod_1.z.enum(['ok', 'error']))
        .openapi({ example: { server: 'ok', mongodb: 'ok' } }),
    timestamp: zod_1.z.string().datetime().openapi({ example: '2024-01-01T00:00:00.000Z' }),
})
    .openapi('HealthCheck'));
/* ------------------------------------------------------------------ */
// Response builders
/* ------------------------------------------------------------------ */
const paginatedResponse = (itemSchema, description) => ({
    description,
    content: {
        'application/json': {
            schema: zod_1.z.object({
                data: zod_1.z.array(itemSchema),
                meta: PaginationMetaSchema,
            }),
        },
    },
});
const itemResponse = (itemSchema, description) => ({
    description,
    content: {
        'application/json': {
            schema: zod_1.z.object({
                success: zod_1.z.literal(true),
                data: itemSchema,
            }),
        },
    },
});
const successResponse = (description) => ({
    description,
    content: {
        'application/json': {
            schema: zod_1.z.object({
                success: zod_1.z.literal(true),
                message: zod_1.z.string(),
            }),
        },
    },
});
const errorResponse = (description) => ({
    description,
    content: {
        'application/json': {
            schema: ApiErrorSchema,
        },
    },
});
const bearerAuth = registry.registerComponent('securitySchemes', 'bearerAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
});
registry.registerComponent('securitySchemes', 'apiKeyAuth', {
    type: 'apiKey',
    in: 'header',
    name: 'X-API-Key',
});
/* ------------------------------------------------------------------ */
// Paths
/* ------------------------------------------------------------------ */
// Health
registry.registerPath({
    method: 'get',
    path: '/health',
    tags: ['System'],
    summary: 'Health check',
    description: 'Returns server, MongoDB, and Redis health status.',
    responses: {
        200: {
            description: 'Service is healthy',
            content: { 'application/json': { schema: HealthCheckSchema } },
        },
        503: {
            description: 'Service is unhealthy',
            content: { 'application/json': { schema: HealthCheckSchema } },
        },
    },
});
// Auth
registry.registerPath({
    method: 'post',
    path: '/api/v1/auth/register',
    tags: ['Auth'],
    summary: 'Register a new user',
    request: {
        body: {
            description: 'User registration details',
            content: {
                'application/json': {
                    schema: zod_1.z.object({
                        firstName: zod_1.z.string().openapi({ example: 'Jane' }),
                        lastName: zod_1.z.string().openapi({ example: 'Doe' }),
                        email: zod_1.z.string().email().openapi({ example: 'jane@example.com' }),
                        password: zod_1.z.string().min(6).openapi({ example: 'SecurePass123!' }),
                        avatar: zod_1.z.string().optional().openapi({ example: 'https://example.com/avatar.png' }),
                    }),
                },
            },
        },
    },
    responses: {
        201: itemResponse(UserSchema, 'User registered successfully'),
        400: errorResponse('Validation failed'),
        409: errorResponse('Email already exists'),
    },
});
registry.registerPath({
    method: 'post',
    path: '/api/v1/auth/login',
    tags: ['Auth'],
    summary: 'Authenticate a user',
    request: {
        body: {
            description: 'Login credentials',
            content: {
                'application/json': {
                    schema: zod_1.z.object({
                        email: zod_1.z.string().email().openapi({ example: 'jane@example.com' }),
                        password: zod_1.z.string().openapi({ example: 'SecurePass123!' }),
                    }),
                },
            },
        },
    },
    responses: {
        200: {
            description: 'Login successful',
            content: {
                'application/json': {
                    schema: zod_1.z.object({
                        success: zod_1.z.literal(true),
                        data: zod_1.z.object({
                            user: UserSchema,
                            tokens: TokenPairSchema,
                        }),
                    }),
                },
            },
        },
        401: errorResponse('Invalid credentials'),
    },
});
registry.registerPath({
    method: 'post',
    path: '/api/v1/auth/refresh',
    tags: ['Auth'],
    summary: 'Refresh access token',
    request: {
        body: {
            description: 'Refresh token',
            content: {
                'application/json': {
                    schema: zod_1.z.object({
                        refreshToken: zod_1.z.string().openapi({ example: 'refresh-token-string' }),
                    }),
                },
            },
        },
    },
    responses: {
        200: {
            description: 'Tokens refreshed',
            content: { 'application/json': { schema: TokenPairSchema } },
        },
        401: errorResponse('Invalid or expired refresh token'),
    },
});
registry.registerPath({
    method: 'post',
    path: '/api/v1/auth/logout',
    tags: ['Auth'],
    summary: 'Log out current user',
    security: [{ [bearerAuth.name]: [] }],
    request: {
        body: {
            description: 'Optional refresh token to revoke',
            content: {
                'application/json': {
                    schema: zod_1.z.object({
                        refreshToken: zod_1.z.string().optional().openapi({ example: 'refresh-token-string' }),
                    }),
                },
            },
        },
    },
    responses: {
        200: successResponse('Logged out successfully'),
        401: errorResponse('Unauthorized'),
    },
});
registry.registerPath({
    method: 'get',
    path: '/api/v1/auth/me',
    tags: ['Auth'],
    summary: 'Get current authenticated user',
    security: [{ [bearerAuth.name]: [] }],
    responses: {
        200: itemResponse(UserSchema, 'Current user'),
        401: errorResponse('Unauthorized'),
    },
});
registry.registerPath({
    method: 'patch',
    path: '/api/v1/auth/change-password',
    tags: ['Auth'],
    summary: 'Change current user password',
    security: [{ [bearerAuth.name]: [] }],
    request: {
        body: {
            description: 'Password change details',
            content: {
                'application/json': {
                    schema: zod_1.z.object({
                        oldPassword: zod_1.z.string().openapi({ example: 'OldPass123!' }),
                        newPassword: zod_1.z.string().min(6).openapi({ example: 'NewPass123!' }),
                    }),
                },
            },
        },
    },
    responses: {
        200: successResponse('Password changed successfully'),
        400: errorResponse('Validation failed'),
        401: errorResponse('Unauthorized'),
    },
});
// Users
registry.registerPath({
    method: 'get',
    path: '/api/v1/users',
    tags: ['Users'],
    summary: 'List users',
    security: [{ [bearerAuth.name]: [] }],
    request: {
        query: zod_1.z.object({
            ...paginationQuery,
            role: zod_1.z
                .enum(['admin', 'manager', 'member'])
                .optional()
                .openapi({
                param: { name: 'role', in: 'query', description: 'Filter by role' },
                example: 'member',
            }),
            isVerified: zod_1.z
                .enum(['true', 'false'])
                .optional()
                .openapi({
                param: { name: 'isVerified', in: 'query', description: 'Filter by verification status' },
                example: 'true',
            }),
            search: zod_1.z
                .string()
                .optional()
                .openapi({
                param: { name: 'search', in: 'query', description: 'Search by name or email' },
                example: 'jane',
            }),
        }),
    },
    responses: {
        200: paginatedResponse(UserSchema, 'List of users'),
        401: errorResponse('Unauthorized'),
        403: errorResponse('Forbidden'),
    },
});
registry.registerPath({
    method: 'get',
    path: '/api/v1/users/{id}',
    tags: ['Users'],
    summary: 'Get user by id',
    security: [{ [bearerAuth.name]: [] }],
    request: {
        params: zod_1.z.object({ id: idParam }),
    },
    responses: {
        200: itemResponse(UserSchema, 'User details'),
        401: errorResponse('Unauthorized'),
        403: errorResponse('Forbidden'),
        404: errorResponse('User not found'),
    },
});
registry.registerPath({
    method: 'patch',
    path: '/api/v1/users/{id}',
    tags: ['Users'],
    summary: 'Update user',
    security: [{ [bearerAuth.name]: [] }],
    request: {
        params: zod_1.z.object({ id: idParam }),
        body: {
            description: 'User update payload',
            content: {
                'application/json': {
                    schema: zod_1.z.object({
                        firstName: zod_1.z.string().optional().openapi({ example: 'Jane' }),
                        lastName: zod_1.z.string().optional().openapi({ example: 'Smith' }),
                        email: zod_1.z.string().email().optional().openapi({ example: 'jane.smith@example.com' }),
                        avatar: zod_1.z.string().optional().openapi({ example: 'https://example.com/avatar.png' }),
                    }),
                },
            },
        },
    },
    responses: {
        200: itemResponse(UserSchema, 'Updated user'),
        400: errorResponse('Validation failed'),
        401: errorResponse('Unauthorized'),
        403: errorResponse('Forbidden'),
        404: errorResponse('User not found'),
    },
});
registry.registerPath({
    method: 'delete',
    path: '/api/v1/users/{id}',
    tags: ['Users'],
    summary: 'Delete user',
    security: [{ [bearerAuth.name]: [] }],
    request: {
        params: zod_1.z.object({ id: idParam }),
    },
    responses: {
        204: { description: 'User deleted successfully' },
        401: errorResponse('Unauthorized'),
        403: errorResponse('Forbidden'),
        404: errorResponse('User not found'),
    },
});
// Teams
registry.registerPath({
    method: 'get',
    path: '/api/v1/teams',
    tags: ['Teams'],
    summary: 'List teams',
    security: [{ [bearerAuth.name]: [] }],
    request: {
        query: zod_1.z.object({
            ...paginationQuery,
            search: zod_1.z
                .string()
                .optional()
                .openapi({
                param: { name: 'search', in: 'query', description: 'Search by name or description' },
                example: 'engineering',
            }),
        }),
    },
    responses: {
        200: paginatedResponse(TeamSchema, 'List of teams'),
        401: errorResponse('Unauthorized'),
    },
});
registry.registerPath({
    method: 'post',
    path: '/api/v1/teams',
    tags: ['Teams'],
    summary: 'Create team',
    security: [{ [bearerAuth.name]: [] }],
    request: {
        body: {
            description: 'Team creation payload',
            content: {
                'application/json': {
                    schema: zod_1.z.object({
                        name: zod_1.z.string().min(1).openapi({ example: 'Engineering' }),
                        description: zod_1.z.string().min(1).openapi({ example: 'The engineering team' }),
                    }),
                },
            },
        },
    },
    responses: {
        201: itemResponse(TeamSchema, 'Team created'),
        400: errorResponse('Validation failed'),
        401: errorResponse('Unauthorized'),
    },
});
registry.registerPath({
    method: 'get',
    path: '/api/v1/teams/{id}',
    tags: ['Teams'],
    summary: 'Get team by id',
    security: [{ [bearerAuth.name]: [] }],
    request: {
        params: zod_1.z.object({ id: idParam }),
    },
    responses: {
        200: itemResponse(TeamSchema, 'Team details'),
        401: errorResponse('Unauthorized'),
        404: errorResponse('Team not found'),
    },
});
registry.registerPath({
    method: 'patch',
    path: '/api/v1/teams/{id}',
    tags: ['Teams'],
    summary: 'Update team',
    security: [{ [bearerAuth.name]: [] }],
    request: {
        params: zod_1.z.object({ id: idParam }),
        body: {
            description: 'Team update payload',
            content: {
                'application/json': {
                    schema: zod_1.z.object({
                        name: zod_1.z.string().min(1).optional().openapi({ example: 'Engineering' }),
                        description: zod_1.z.string().min(1).optional().openapi({ example: 'The engineering team' }),
                    }),
                },
            },
        },
    },
    responses: {
        200: itemResponse(TeamSchema, 'Updated team'),
        400: errorResponse('Validation failed'),
        401: errorResponse('Unauthorized'),
        403: errorResponse('Forbidden'),
        404: errorResponse('Team not found'),
    },
});
registry.registerPath({
    method: 'delete',
    path: '/api/v1/teams/{id}',
    tags: ['Teams'],
    summary: 'Delete team',
    security: [{ [bearerAuth.name]: [] }],
    request: {
        params: zod_1.z.object({ id: idParam }),
    },
    responses: {
        204: { description: 'Team deleted successfully' },
        401: errorResponse('Unauthorized'),
        403: errorResponse('Forbidden'),
        404: errorResponse('Team not found'),
    },
});
// Projects
registry.registerPath({
    method: 'get',
    path: '/api/v1/projects',
    tags: ['Projects'],
    summary: 'List projects',
    security: [{ [bearerAuth.name]: [] }],
    request: {
        query: zod_1.z.object({
            ...paginationQuery,
            teamId: zod_1.z
                .string()
                .optional()
                .openapi({
                param: { name: 'teamId', in: 'query', description: 'Filter by team id' },
                example: '507f1f77bcf86cd799439011',
            }),
            status: zod_1.z
                .enum(['active', 'completed', 'archived'])
                .optional()
                .openapi({
                param: { name: 'status', in: 'query', description: 'Filter by status' },
                example: 'active',
            }),
            search: zod_1.z
                .string()
                .optional()
                .openapi({
                param: { name: 'search', in: 'query', description: 'Search by name or description' },
                example: 'website',
            }),
        }),
    },
    responses: {
        200: paginatedResponse(ProjectSchema, 'List of projects'),
        401: errorResponse('Unauthorized'),
    },
});
registry.registerPath({
    method: 'post',
    path: '/api/v1/projects',
    tags: ['Projects'],
    summary: 'Create project',
    security: [{ [bearerAuth.name]: [] }],
    request: {
        body: {
            description: 'Project creation payload',
            content: {
                'application/json': {
                    schema: zod_1.z.object({
                        name: zod_1.z.string().min(1).openapi({ example: 'Website redesign' }),
                        description: zod_1.z.string().min(1).openapi({ example: 'Redesign the public website' }),
                        teamId: zod_1.z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
                        status: zod_1.z
                            .enum(['active', 'completed', 'archived'])
                            .optional()
                            .openapi({ example: 'active' }),
                        startDate: zod_1.z
                            .string()
                            .datetime()
                            .optional()
                            .openapi({ example: '2024-01-01T00:00:00.000Z' }),
                        dueDate: zod_1.z
                            .string()
                            .datetime()
                            .optional()
                            .openapi({ example: '2024-06-01T00:00:00.000Z' }),
                    }),
                },
            },
        },
    },
    responses: {
        201: itemResponse(ProjectSchema, 'Project created'),
        400: errorResponse('Validation failed'),
        401: errorResponse('Unauthorized'),
    },
});
registry.registerPath({
    method: 'get',
    path: '/api/v1/projects/{id}',
    tags: ['Projects'],
    summary: 'Get project by id',
    security: [{ [bearerAuth.name]: [] }],
    request: {
        params: zod_1.z.object({ id: idParam }),
    },
    responses: {
        200: itemResponse(ProjectSchema, 'Project details'),
        401: errorResponse('Unauthorized'),
        404: errorResponse('Project not found'),
    },
});
registry.registerPath({
    method: 'patch',
    path: '/api/v1/projects/{id}',
    tags: ['Projects'],
    summary: 'Update project',
    security: [{ [bearerAuth.name]: [] }],
    request: {
        params: zod_1.z.object({ id: idParam }),
        body: {
            description: 'Project update payload',
            content: {
                'application/json': {
                    schema: zod_1.z.object({
                        name: zod_1.z.string().min(1).optional().openapi({ example: 'Website redesign' }),
                        description: zod_1.z
                            .string()
                            .min(1)
                            .optional()
                            .openapi({ example: 'Redesign the public website' }),
                        status: zod_1.z
                            .enum(['active', 'completed', 'archived'])
                            .optional()
                            .openapi({ example: 'active' }),
                        startDate: zod_1.z
                            .string()
                            .datetime()
                            .optional()
                            .openapi({ example: '2024-01-01T00:00:00.000Z' }),
                        dueDate: zod_1.z
                            .string()
                            .datetime()
                            .optional()
                            .openapi({ example: '2024-06-01T00:00:00.000Z' }),
                    }),
                },
            },
        },
    },
    responses: {
        200: itemResponse(ProjectSchema, 'Updated project'),
        400: errorResponse('Validation failed'),
        401: errorResponse('Unauthorized'),
        403: errorResponse('Forbidden'),
        404: errorResponse('Project not found'),
    },
});
registry.registerPath({
    method: 'delete',
    path: '/api/v1/projects/{id}',
    tags: ['Projects'],
    summary: 'Delete project',
    security: [{ [bearerAuth.name]: [] }],
    request: {
        params: zod_1.z.object({ id: idParam }),
    },
    responses: {
        204: { description: 'Project deleted successfully' },
        401: errorResponse('Unauthorized'),
        403: errorResponse('Forbidden'),
        404: errorResponse('Project not found'),
    },
});
registry.registerPath({
    method: 'get',
    path: '/api/v1/projects/dashboard',
    tags: ['Projects'],
    summary: 'Get project dashboard stats',
    security: [{ [bearerAuth.name]: [] }],
    responses: {
        200: {
            description: 'Project dashboard data',
            content: {
                'application/json': {
                    schema: zod_1.z.object({
                        success: zod_1.z.literal(true),
                        data: zod_1.z.object({
                            statusDistribution: zod_1.z.array(zod_1.z.object({ _id: zod_1.z.string(), count: zod_1.z.number() })),
                        }),
                    }),
                },
            },
        },
        401: errorResponse('Unauthorized'),
    },
});
// Tasks
registry.registerPath({
    method: 'get',
    path: '/api/v1/tasks',
    tags: ['Tasks'],
    summary: 'List tasks',
    security: [{ [bearerAuth.name]: [] }],
    request: {
        query: zod_1.z.object({
            ...paginationQuery,
            projectId: zod_1.z
                .string()
                .optional()
                .openapi({
                param: { name: 'projectId', in: 'query', description: 'Filter by project id' },
                example: '507f1f77bcf86cd799439011',
            }),
            assignedTo: zod_1.z
                .string()
                .optional()
                .openapi({
                param: { name: 'assignedTo', in: 'query', description: 'Filter by assignee id' },
                example: '507f1f77bcf86cd799439011',
            }),
            createdBy: zod_1.z
                .string()
                .optional()
                .openapi({
                param: { name: 'createdBy', in: 'query', description: 'Filter by creator id' },
                example: '507f1f77bcf86cd799439011',
            }),
            status: zod_1.z
                .enum(['todo', 'in-progress', 'review', 'done'])
                .optional()
                .openapi({
                param: { name: 'status', in: 'query', description: 'Filter by status' },
                example: 'in-progress',
            }),
            priority: zod_1.z
                .enum(['low', 'medium', 'high', 'critical'])
                .optional()
                .openapi({
                param: { name: 'priority', in: 'query', description: 'Filter by priority' },
                example: 'high',
            }),
            search: zod_1.z
                .string()
                .optional()
                .openapi({
                param: { name: 'search', in: 'query', description: 'Search by title or description' },
                example: 'login',
            }),
        }),
    },
    responses: {
        200: paginatedResponse(TaskSchema, 'List of tasks'),
        401: errorResponse('Unauthorized'),
    },
});
registry.registerPath({
    method: 'post',
    path: '/api/v1/tasks',
    tags: ['Tasks'],
    summary: 'Create task',
    security: [{ [bearerAuth.name]: [] }],
    request: {
        body: {
            description: 'Task creation payload',
            content: {
                'application/json': {
                    schema: zod_1.z.object({
                        title: zod_1.z.string().min(1).openapi({ example: 'Fix login bug' }),
                        description: zod_1.z.string().min(1).openapi({ example: 'Users cannot log in with Google' }),
                        projectId: zod_1.z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
                        assignedTo: zod_1.z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
                        priority: zod_1.z
                            .enum(['low', 'medium', 'high', 'critical'])
                            .optional()
                            .openapi({ example: 'high' }),
                        status: zod_1.z
                            .enum(['todo', 'in-progress', 'review', 'done'])
                            .optional()
                            .openapi({ example: 'todo' }),
                        dueDate: zod_1.z
                            .string()
                            .datetime()
                            .optional()
                            .openapi({ example: '2024-06-01T00:00:00.000Z' }),
                        estimatedHours: zod_1.z.number().min(0).optional().openapi({ example: 4 }),
                        actualHours: zod_1.z.number().min(0).optional().openapi({ example: 0 }),
                    }),
                },
            },
        },
    },
    responses: {
        201: itemResponse(TaskSchema, 'Task created'),
        400: errorResponse('Validation failed'),
        401: errorResponse('Unauthorized'),
    },
});
registry.registerPath({
    method: 'get',
    path: '/api/v1/tasks/{id}',
    tags: ['Tasks'],
    summary: 'Get task by id',
    security: [{ [bearerAuth.name]: [] }],
    request: {
        params: zod_1.z.object({ id: idParam }),
    },
    responses: {
        200: itemResponse(TaskSchema, 'Task details'),
        401: errorResponse('Unauthorized'),
        404: errorResponse('Task not found'),
    },
});
registry.registerPath({
    method: 'patch',
    path: '/api/v1/tasks/{id}',
    tags: ['Tasks'],
    summary: 'Update task',
    security: [{ [bearerAuth.name]: [] }],
    request: {
        params: zod_1.z.object({ id: idParam }),
        body: {
            description: 'Task update payload',
            content: {
                'application/json': {
                    schema: zod_1.z.object({
                        title: zod_1.z.string().min(1).optional().openapi({ example: 'Fix login bug' }),
                        description: zod_1.z.string().min(1).optional().openapi({ example: 'Updated description' }),
                        priority: zod_1.z
                            .enum(['low', 'medium', 'high', 'critical'])
                            .optional()
                            .openapi({ example: 'critical' }),
                        status: zod_1.z
                            .enum(['todo', 'in-progress', 'review', 'done'])
                            .optional()
                            .openapi({ example: 'done' }),
                        assignedTo: zod_1.z.string().optional().openapi({ example: '507f1f77bcf86cd799439011' }),
                        dueDate: zod_1.z
                            .string()
                            .datetime()
                            .optional()
                            .openapi({ example: '2024-06-01T00:00:00.000Z' }),
                        estimatedHours: zod_1.z.number().min(0).optional().openapi({ example: 4 }),
                        actualHours: zod_1.z.number().min(0).optional().openapi({ example: 3 }),
                    }),
                },
            },
        },
    },
    responses: {
        200: itemResponse(TaskSchema, 'Updated task'),
        400: errorResponse('Validation failed'),
        401: errorResponse('Unauthorized'),
        403: errorResponse('Forbidden'),
        404: errorResponse('Task not found'),
    },
});
registry.registerPath({
    method: 'delete',
    path: '/api/v1/tasks/{id}',
    tags: ['Tasks'],
    summary: 'Delete task',
    security: [{ [bearerAuth.name]: [] }],
    request: {
        params: zod_1.z.object({ id: idParam }),
    },
    responses: {
        204: { description: 'Task deleted successfully' },
        401: errorResponse('Unauthorized'),
        403: errorResponse('Forbidden'),
        404: errorResponse('Task not found'),
    },
});
registry.registerPath({
    method: 'get',
    path: '/api/v1/tasks/dashboard',
    tags: ['Tasks'],
    summary: 'Get task dashboard stats',
    security: [{ [bearerAuth.name]: [] }],
    responses: {
        200: {
            description: 'Task dashboard data',
            content: {
                'application/json': {
                    schema: zod_1.z.object({
                        success: zod_1.z.literal(true),
                        data: zod_1.z.object({
                            statusDistribution: zod_1.z.array(zod_1.z.object({ _id: zod_1.z.string(), count: zod_1.z.number() })),
                            priorityDistribution: zod_1.z.array(zod_1.z.object({ _id: zod_1.z.string(), count: zod_1.z.number() })),
                            overdueSummary: zod_1.z.object({ total: zod_1.z.number(), overdue: zod_1.z.number() }),
                            workload: zod_1.z.array(zod_1.z.object({ _id: zod_1.z.string(), assigned: zod_1.z.number(), done: zod_1.z.number() })),
                        }),
                    }),
                },
            },
        },
        401: errorResponse('Unauthorized'),
    },
});
// Comments
registry.registerPath({
    method: 'get',
    path: '/api/v1/comments',
    tags: ['Comments'],
    summary: 'List comments',
    security: [{ [bearerAuth.name]: [] }],
    request: {
        query: zod_1.z.object({
            ...paginationQuery,
            taskId: zod_1.z
                .string()
                .optional()
                .openapi({
                param: { name: 'taskId', in: 'query', description: 'Filter by task id' },
                example: '507f1f77bcf86cd799439011',
            }),
            search: zod_1.z
                .string()
                .optional()
                .openapi({
                param: { name: 'search', in: 'query', description: 'Search comment content' },
                example: 'looks good',
            }),
        }),
    },
    responses: {
        200: paginatedResponse(CommentSchema, 'List of comments'),
        401: errorResponse('Unauthorized'),
    },
});
registry.registerPath({
    method: 'post',
    path: '/api/v1/comments',
    tags: ['Comments'],
    summary: 'Create comment',
    security: [{ [bearerAuth.name]: [] }],
    request: {
        body: {
            description: 'Comment creation payload',
            content: {
                'application/json': {
                    schema: zod_1.z.object({
                        taskId: zod_1.z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
                        content: zod_1.z.string().min(1).openapi({ example: 'Looks good to me' }),
                        parentId: zod_1.z.string().optional().openapi({ example: '507f1f77bcf86cd799439011' }),
                    }),
                },
            },
        },
    },
    responses: {
        201: itemResponse(CommentSchema, 'Comment created'),
        400: errorResponse('Validation failed'),
        401: errorResponse('Unauthorized'),
    },
});
registry.registerPath({
    method: 'get',
    path: '/api/v1/comments/{id}',
    tags: ['Comments'],
    summary: 'Get comment by id',
    security: [{ [bearerAuth.name]: [] }],
    request: {
        params: zod_1.z.object({ id: idParam }),
    },
    responses: {
        200: itemResponse(CommentSchema, 'Comment details'),
        401: errorResponse('Unauthorized'),
        404: errorResponse('Comment not found'),
    },
});
registry.registerPath({
    method: 'patch',
    path: '/api/v1/comments/{id}',
    tags: ['Comments'],
    summary: 'Update comment',
    security: [{ [bearerAuth.name]: [] }],
    request: {
        params: zod_1.z.object({ id: idParam }),
        body: {
            description: 'Comment update payload',
            content: {
                'application/json': {
                    schema: zod_1.z.object({
                        content: zod_1.z.string().min(1).openapi({ example: 'Updated comment content' }),
                    }),
                },
            },
        },
    },
    responses: {
        200: itemResponse(CommentSchema, 'Updated comment'),
        400: errorResponse('Validation failed'),
        401: errorResponse('Unauthorized'),
        403: errorResponse('Forbidden'),
        404: errorResponse('Comment not found'),
    },
});
registry.registerPath({
    method: 'delete',
    path: '/api/v1/comments/{id}',
    tags: ['Comments'],
    summary: 'Delete comment',
    security: [{ [bearerAuth.name]: [] }],
    request: {
        params: zod_1.z.object({ id: idParam }),
    },
    responses: {
        204: { description: 'Comment deleted successfully' },
        401: errorResponse('Unauthorized'),
        403: errorResponse('Forbidden'),
        404: errorResponse('Comment not found'),
    },
});
// Notifications
registry.registerPath({
    method: 'get',
    path: '/api/v1/notifications',
    tags: ['Notifications'],
    summary: 'List notifications',
    security: [{ [bearerAuth.name]: [] }],
    request: {
        query: zod_1.z.object({
            ...paginationQuery,
            isRead: zod_1.z
                .enum(['true', 'false'])
                .optional()
                .openapi({
                param: { name: 'isRead', in: 'query', description: 'Filter by read status' },
                example: 'false',
            }),
            type: zod_1.z
                .enum([
                'task-assigned',
                'task-updated',
                'comment-added',
                'project-created',
                'mention',
                'due-soon',
                'invite',
            ])
                .optional()
                .openapi({
                param: { name: 'type', in: 'query', description: 'Filter by notification type' },
                example: 'task-assigned',
            }),
            search: zod_1.z
                .string()
                .optional()
                .openapi({
                param: { name: 'search', in: 'query', description: 'Search title or message' },
                example: 'assigned',
            }),
        }),
    },
    responses: {
        200: paginatedResponse(NotificationSchema, 'List of notifications'),
        401: errorResponse('Unauthorized'),
    },
});
registry.registerPath({
    method: 'get',
    path: '/api/v1/notifications/dashboard',
    tags: ['Notifications'],
    summary: 'Get notification dashboard stats',
    security: [{ [bearerAuth.name]: [] }],
    responses: {
        200: {
            description: 'Notification dashboard data',
            content: {
                'application/json': {
                    schema: zod_1.z.object({
                        success: zod_1.z.literal(true),
                        data: zod_1.z.object({
                            unreadCountsByType: zod_1.z.array(zod_1.z.object({ _id: zod_1.z.string(), count: zod_1.z.number() })),
                            deliveryStats: zod_1.z.array(zod_1.z.object({ _id: zod_1.z.string(), count: zod_1.z.number() })),
                        }),
                    }),
                },
            },
        },
        401: errorResponse('Unauthorized'),
    },
});
registry.registerPath({
    method: 'patch',
    path: '/api/v1/notifications/{id}/read',
    tags: ['Notifications'],
    summary: 'Mark notification as read',
    security: [{ [bearerAuth.name]: [] }],
    request: {
        params: zod_1.z.object({ id: idParam }),
    },
    responses: {
        200: itemResponse(NotificationSchema, 'Notification marked as read'),
        401: errorResponse('Unauthorized'),
        404: errorResponse('Notification not found'),
    },
});
// API Keys
registry.registerPath({
    method: 'get',
    path: '/api/v1/auth/api-keys',
    tags: ['API Keys'],
    summary: 'List API keys',
    security: [{ [bearerAuth.name]: [] }],
    request: {
        query: zod_1.z.object(paginationQuery),
    },
    responses: {
        200: paginatedResponse(ApiKeySchema, 'List of API keys'),
        401: errorResponse('Unauthorized'),
    },
});
registry.registerPath({
    method: 'post',
    path: '/api/v1/auth/api-keys',
    tags: ['API Keys'],
    summary: 'Create API key',
    security: [{ [bearerAuth.name]: [] }],
    request: {
        body: {
            description: 'API key creation payload',
            content: {
                'application/json': {
                    schema: zod_1.z.object({
                        name: zod_1.z.string().min(1).openapi({ example: 'CI deployment key' }),
                        scopes: zod_1.z
                            .array(zod_1.z.enum(['read', 'write', 'admin']))
                            .optional()
                            .openapi({ example: ['read', 'write'] }),
                        expiresInDays: zod_1.z.number().min(1).max(365).optional().openapi({ example: 365 }),
                    }),
                },
            },
        },
    },
    responses: {
        201: {
            description: 'API key created. The plaintext key is returned only once.',
            content: {
                'application/json': {
                    schema: zod_1.z.object({
                        success: zod_1.z.literal(true),
                        data: zod_1.z.object({
                            apiKey: ApiKeySchema,
                            plaintextKey: zod_1.z.string().openapi({ example: 'npak_a1b2c3d4_secretvalue' }),
                        }),
                    }),
                },
            },
        },
        400: errorResponse('Validation failed'),
        401: errorResponse('Unauthorized'),
    },
});
registry.registerPath({
    method: 'delete',
    path: '/api/v1/auth/api-keys/{id}',
    tags: ['API Keys'],
    summary: 'Revoke API key',
    security: [{ [bearerAuth.name]: [] }],
    request: {
        params: zod_1.z.object({ id: idParam }),
    },
    responses: {
        204: { description: 'API key revoked successfully' },
        401: errorResponse('Unauthorized'),
        404: errorResponse('API key not found'),
    },
});
// SSE
registry.registerPath({
    method: 'get',
    path: '/api/v1/events/stream',
    tags: ['Events'],
    summary: 'Server-Sent Events stream',
    description: 'Opens an SSE stream for real-time notifications. Requires Bearer authentication.',
    security: [{ [bearerAuth.name]: [] }],
    responses: {
        200: {
            description: 'SSE stream opened',
            content: {
                'text/event-stream': {
                    schema: zod_1.z.string().openapi({ example: 'event: notification\ndata: {}\n\n' }),
                },
            },
        },
        401: errorResponse('Unauthorized'),
    },
});
/* ------------------------------------------------------------------ */
// Generator
/* ------------------------------------------------------------------ */
exports.openApiDocument = new zod_to_openapi_1.OpenApiGeneratorV3(registry.definitions).generateDocument({
    openapi: '3.0.0',
    info: {
        title: env_1.env.APP_NAME,
        description: 'Production-grade Node.js API for team/project/task management.',
        version: '1.0.0',
    },
    servers: [
        {
            url: '/api/v1',
            description: 'API v1',
        },
    ],
});
//# sourceMappingURL=openapi.js.map