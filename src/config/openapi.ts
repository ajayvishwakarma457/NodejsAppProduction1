import { extendZodWithOpenApi, OpenApiGeneratorV3, OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import { env } from './env';

extendZodWithOpenApi(z);

/* ------------------------------------------------------------------ */
// Registry
/* ------------------------------------------------------------------ */

const registry = new OpenAPIRegistry();

/* ------------------------------------------------------------------ */
// Parameter helpers
/* ------------------------------------------------------------------ */

const idParam = registry.registerParameter(
  'Id',
  z.string().openapi({
    param: {
      name: 'id',
      in: 'path',
      required: true,
      description: 'MongoDB document id',
    },
    example: '507f1f77bcf86cd799439011',
  })
);

const paginationQuery = {
  page: z.coerce.number().min(1).optional().openapi({
    param: { name: 'page', in: 'query', description: 'Page number' },
    example: 1,
  }),
  limit: z.coerce.number().min(1).max(100).optional().openapi({
    param: { name: 'limit', in: 'query', description: 'Items per page' },
    example: 10,
  }),
  sort: z.string().optional().openapi({
    param: { name: 'sort', in: 'query', description: 'Field to sort by' },
    example: 'createdAt',
  }),
  order: z.enum(['asc', 'desc']).optional().openapi({
    param: { name: 'order', in: 'query', description: 'Sort order' },
    example: 'desc',
  }),
};

/* ------------------------------------------------------------------ */
// Common schemas
/* ------------------------------------------------------------------ */

const ApiErrorSchema = registry.register(
  'ApiError',
  z
    .object({
      success: z.boolean().openapi({ example: false }),
      message: z.string().openapi({ example: 'Bad request' }),
      requestId: z.string().openapi({ example: 'a1b2c3d4' }),
      details: z.unknown().optional(),
      stack: z.string().optional(),
    })
    .openapi('ApiError')
);

const PaginationMetaSchema = registry.register(
  'PaginationMeta',
  z
    .object({
      page: z.number().openapi({ example: 1 }),
      limit: z.number().openapi({ example: 10 }),
      total: z.number().openapi({ example: 42 }),
      totalPages: z.number().openapi({ example: 5 }),
    })
    .openapi('PaginationMeta')
);

const UserSchema = registry.register(
  'User',
  z
    .object({
      id: z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
      firstName: z.string().openapi({ example: 'Jane' }),
      lastName: z.string().openapi({ example: 'Doe' }),
      email: z.string().email().openapi({ example: 'jane@example.com' }),
      role: z.enum(['admin', 'manager', 'member']).openapi({ example: 'member' }),
      isVerified: z.boolean().openapi({ example: true }),
      avatar: z.string().nullable().openapi({ example: 'https://example.com/avatar.png' }),
      provider: z.enum(['local', 'google', 'github']).openapi({ example: 'local' }),
      createdAt: z.string().datetime().openapi({ example: '2024-01-01T00:00:00.000Z' }),
      updatedAt: z.string().datetime().openapi({ example: '2024-01-01T00:00:00.000Z' }),
    })
    .openapi('User')
);

const TeamMemberSchema = registry.register(
  'TeamMember',
  z
    .object({
      userId: z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
      role: z.enum(['owner', 'admin', 'member']).openapi({ example: 'member' }),
      joinedAt: z.string().datetime().openapi({ example: '2024-01-01T00:00:00.000Z' }),
    })
    .openapi('TeamMember')
);

const TeamSchema = registry.register(
  'Team',
  z
    .object({
      id: z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
      name: z.string().openapi({ example: 'Engineering' }),
      description: z.string().openapi({ example: 'The engineering team' }),
      ownerId: z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
      members: z.array(TeamMemberSchema).openapi({ example: [] }),
      createdAt: z.string().datetime().openapi({ example: '2024-01-01T00:00:00.000Z' }),
      updatedAt: z.string().datetime().openapi({ example: '2024-01-01T00:00:00.000Z' }),
    })
    .openapi('Team')
);

const ProjectSchema = registry.register(
  'Project',
  z
    .object({
      id: z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
      name: z.string().openapi({ example: 'Website redesign' }),
      description: z.string().openapi({ example: 'Redesign the public website' }),
      status: z.enum(['active', 'completed', 'archived']).openapi({ example: 'active' }),
      ownerId: z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
      teamId: z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
      startDate: z.string().datetime().nullable().openapi({ example: null }),
      dueDate: z.string().datetime().nullable().openapi({ example: '2024-06-01T00:00:00.000Z' }),
      createdAt: z.string().datetime().openapi({ example: '2024-01-01T00:00:00.000Z' }),
      updatedAt: z.string().datetime().openapi({ example: '2024-01-01T00:00:00.000Z' }),
    })
    .openapi('Project')
);

const TaskSchema = registry.register(
  'Task',
  z
    .object({
      id: z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
      title: z.string().openapi({ example: 'Fix login bug' }),
      description: z.string().openapi({ example: 'Users cannot log in with Google' }),
      priority: z.enum(['low', 'medium', 'high', 'critical']).openapi({ example: 'high' }),
      status: z.enum(['todo', 'in-progress', 'review', 'done']).openapi({ example: 'in-progress' }),
      projectId: z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
      createdBy: z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
      assignedTo: z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
      dueDate: z.string().datetime().nullable().openapi({ example: '2024-06-01T00:00:00.000Z' }),
      estimatedHours: z.number().openapi({ example: 4 }),
      actualHours: z.number().openapi({ example: 2 }),
      createdAt: z.string().datetime().openapi({ example: '2024-01-01T00:00:00.000Z' }),
      updatedAt: z.string().datetime().openapi({ example: '2024-01-01T00:00:00.000Z' }),
    })
    .openapi('Task')
);

const CommentSchema = registry.register(
  'Comment',
  z
    .object({
      id: z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
      taskId: z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
      userId: z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
      parentId: z.string().nullable().openapi({ example: null }),
      content: z.string().openapi({ example: 'Looks good to me' }),
      createdAt: z.string().datetime().openapi({ example: '2024-01-01T00:00:00.000Z' }),
      updatedAt: z.string().datetime().openapi({ example: '2024-01-01T00:00:00.000Z' }),
    })
    .openapi('Comment')
);

const NotificationSchema = registry.register(
  'Notification',
  z
    .object({
      id: z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
      userId: z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
      title: z.string().openapi({ example: 'Task assigned' }),
      message: z.string().openapi({ example: 'You have been assigned to Fix login bug' }),
      type: z
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
      channels: z.array(z.enum(['in-app', 'email', 'socket'])).openapi({ example: ['in-app'] }),
      isRead: z.boolean().openapi({ example: false }),
      status: z.enum(['pending', 'delivered', 'failed']).openapi({ example: 'pending' }),
      createdAt: z.string().datetime().openapi({ example: '2024-01-01T00:00:00.000Z' }),
      updatedAt: z.string().datetime().openapi({ example: '2024-01-01T00:00:00.000Z' }),
    })
    .openapi('Notification')
);

const ApiKeySchema = registry.register(
  'ApiKey',
  z
    .object({
      id: z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
      userId: z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
      name: z.string().openapi({ example: 'CI deployment key' }),
      publicId: z.string().openapi({ example: 'npak_a1b2c3d4' }),
      keyPrefix: z.string().openapi({ example: 'npak' }),
      role: z.enum(['admin', 'manager', 'member']).openapi({ example: 'member' }),
      scopes: z.array(z.enum(['read', 'write', 'admin'])).openapi({ example: ['read', 'write'] }),
      expiresAt: z.string().datetime().openapi({ example: '2025-01-01T00:00:00.000Z' }),
      isActive: z.boolean().openapi({ example: true }),
      createdAt: z.string().datetime().openapi({ example: '2024-01-01T00:00:00.000Z' }),
      updatedAt: z.string().datetime().openapi({ example: '2024-01-01T00:00:00.000Z' }),
    })
    .openapi('ApiKey')
);

const TokenPairSchema = registry.register(
  'TokenPair',
  z
    .object({
      accessToken: z.string().openapi({
        example:
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
      }),
      refreshToken: z.string().openapi({ example: 'refresh-token-string' }),
    })
    .openapi('TokenPair')
);

const HealthCheckSchema = registry.register(
  'HealthCheck',
  z
    .object({
      success: z.boolean().openapi({ example: true }),
      message: z.string().openapi({ example: 'OK' }),
      checks: z.record(z.enum(['ok', 'error'])).openapi({ example: { server: 'ok', mongodb: 'ok' } }),
      timestamp: z.string().datetime().openapi({ example: '2024-01-01T00:00:00.000Z' }),
    })
    .openapi('HealthCheck')
);

/* ------------------------------------------------------------------ */
// Response builders
/* ------------------------------------------------------------------ */

const paginatedResponse = <T extends z.ZodTypeAny>(itemSchema: T, description: string) => ({
  description,
  content: {
    'application/json': {
      schema: z.object({
        data: z.array(itemSchema),
        meta: PaginationMetaSchema,
      }),
    },
  },
});

const itemResponse = <T extends z.ZodTypeAny>(itemSchema: T, description: string) => ({
  description,
  content: {
    'application/json': {
      schema: z.object({
        success: z.literal(true),
        data: itemSchema,
      }),
    },
  },
});

const successResponse = (description: string) => ({
  description,
  content: {
    'application/json': {
      schema: z.object({
        success: z.literal(true),
        message: z.string(),
      }),
    },
  },
});

const errorResponse = (description: string) => ({
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
          schema: z.object({
            firstName: z.string().openapi({ example: 'Jane' }),
            lastName: z.string().openapi({ example: 'Doe' }),
            email: z.string().email().openapi({ example: 'jane@example.com' }),
            password: z.string().min(6).openapi({ example: 'SecurePass123!' }),
            avatar: z.string().optional().openapi({ example: 'https://example.com/avatar.png' }),
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
          schema: z.object({
            email: z.string().email().openapi({ example: 'jane@example.com' }),
            password: z.string().openapi({ example: 'SecurePass123!' }),
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
          schema: z.object({
            success: z.literal(true),
            data: z.object({
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
          schema: z.object({
            refreshToken: z.string().openapi({ example: 'refresh-token-string' }),
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
          schema: z.object({
            refreshToken: z.string().optional().openapi({ example: 'refresh-token-string' }),
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
          schema: z.object({
            oldPassword: z.string().openapi({ example: 'OldPass123!' }),
            newPassword: z.string().min(6).openapi({ example: 'NewPass123!' }),
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
    query: z.object({
      ...paginationQuery,
      role: z.enum(['admin', 'manager', 'member']).optional().openapi({
        param: { name: 'role', in: 'query', description: 'Filter by role' },
        example: 'member',
      }),
      isVerified: z.enum(['true', 'false']).optional().openapi({
        param: { name: 'isVerified', in: 'query', description: 'Filter by verification status' },
        example: 'true',
      }),
      search: z.string().optional().openapi({
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
    params: z.object({ id: idParam }),
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
    params: z.object({ id: idParam }),
    body: {
      description: 'User update payload',
      content: {
        'application/json': {
          schema: z.object({
            firstName: z.string().optional().openapi({ example: 'Jane' }),
            lastName: z.string().optional().openapi({ example: 'Smith' }),
            email: z.string().email().optional().openapi({ example: 'jane.smith@example.com' }),
            avatar: z.string().optional().openapi({ example: 'https://example.com/avatar.png' }),
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
    params: z.object({ id: idParam }),
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
    query: z.object({
      ...paginationQuery,
      search: z.string().optional().openapi({
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
          schema: z.object({
            name: z.string().min(1).openapi({ example: 'Engineering' }),
            description: z.string().min(1).openapi({ example: 'The engineering team' }),
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
    params: z.object({ id: idParam }),
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
    params: z.object({ id: idParam }),
    body: {
      description: 'Team update payload',
      content: {
        'application/json': {
          schema: z.object({
            name: z.string().min(1).optional().openapi({ example: 'Engineering' }),
            description: z.string().min(1).optional().openapi({ example: 'The engineering team' }),
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
    params: z.object({ id: idParam }),
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
    query: z.object({
      ...paginationQuery,
      teamId: z.string().optional().openapi({
        param: { name: 'teamId', in: 'query', description: 'Filter by team id' },
        example: '507f1f77bcf86cd799439011',
      }),
      status: z.enum(['active', 'completed', 'archived']).optional().openapi({
        param: { name: 'status', in: 'query', description: 'Filter by status' },
        example: 'active',
      }),
      search: z.string().optional().openapi({
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
          schema: z.object({
            name: z.string().min(1).openapi({ example: 'Website redesign' }),
            description: z.string().min(1).openapi({ example: 'Redesign the public website' }),
            teamId: z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
            status: z.enum(['active', 'completed', 'archived']).optional().openapi({ example: 'active' }),
            startDate: z.string().datetime().optional().openapi({ example: '2024-01-01T00:00:00.000Z' }),
            dueDate: z.string().datetime().optional().openapi({ example: '2024-06-01T00:00:00.000Z' }),
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
    params: z.object({ id: idParam }),
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
    params: z.object({ id: idParam }),
    body: {
      description: 'Project update payload',
      content: {
        'application/json': {
          schema: z.object({
            name: z.string().min(1).optional().openapi({ example: 'Website redesign' }),
            description: z.string().min(1).optional().openapi({ example: 'Redesign the public website' }),
            status: z.enum(['active', 'completed', 'archived']).optional().openapi({ example: 'active' }),
            startDate: z.string().datetime().optional().openapi({ example: '2024-01-01T00:00:00.000Z' }),
            dueDate: z.string().datetime().optional().openapi({ example: '2024-06-01T00:00:00.000Z' }),
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
    params: z.object({ id: idParam }),
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
          schema: z.object({
            success: z.literal(true),
            data: z.object({
              statusDistribution: z.array(z.object({ _id: z.string(), count: z.number() })),
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
    query: z.object({
      ...paginationQuery,
      projectId: z.string().optional().openapi({
        param: { name: 'projectId', in: 'query', description: 'Filter by project id' },
        example: '507f1f77bcf86cd799439011',
      }),
      assignedTo: z.string().optional().openapi({
        param: { name: 'assignedTo', in: 'query', description: 'Filter by assignee id' },
        example: '507f1f77bcf86cd799439011',
      }),
      createdBy: z.string().optional().openapi({
        param: { name: 'createdBy', in: 'query', description: 'Filter by creator id' },
        example: '507f1f77bcf86cd799439011',
      }),
      status: z.enum(['todo', 'in-progress', 'review', 'done']).optional().openapi({
        param: { name: 'status', in: 'query', description: 'Filter by status' },
        example: 'in-progress',
      }),
      priority: z.enum(['low', 'medium', 'high', 'critical']).optional().openapi({
        param: { name: 'priority', in: 'query', description: 'Filter by priority' },
        example: 'high',
      }),
      search: z.string().optional().openapi({
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
          schema: z.object({
            title: z.string().min(1).openapi({ example: 'Fix login bug' }),
            description: z.string().min(1).openapi({ example: 'Users cannot log in with Google' }),
            projectId: z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
            assignedTo: z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
            priority: z.enum(['low', 'medium', 'high', 'critical']).optional().openapi({ example: 'high' }),
            status: z.enum(['todo', 'in-progress', 'review', 'done']).optional().openapi({ example: 'todo' }),
            dueDate: z.string().datetime().optional().openapi({ example: '2024-06-01T00:00:00.000Z' }),
            estimatedHours: z.number().min(0).optional().openapi({ example: 4 }),
            actualHours: z.number().min(0).optional().openapi({ example: 0 }),
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
    params: z.object({ id: idParam }),
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
    params: z.object({ id: idParam }),
    body: {
      description: 'Task update payload',
      content: {
        'application/json': {
          schema: z.object({
            title: z.string().min(1).optional().openapi({ example: 'Fix login bug' }),
            description: z.string().min(1).optional().openapi({ example: 'Updated description' }),
            priority: z.enum(['low', 'medium', 'high', 'critical']).optional().openapi({ example: 'critical' }),
            status: z.enum(['todo', 'in-progress', 'review', 'done']).optional().openapi({ example: 'done' }),
            assignedTo: z.string().optional().openapi({ example: '507f1f77bcf86cd799439011' }),
            dueDate: z.string().datetime().optional().openapi({ example: '2024-06-01T00:00:00.000Z' }),
            estimatedHours: z.number().min(0).optional().openapi({ example: 4 }),
            actualHours: z.number().min(0).optional().openapi({ example: 3 }),
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
    params: z.object({ id: idParam }),
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
          schema: z.object({
            success: z.literal(true),
            data: z.object({
              statusDistribution: z.array(z.object({ _id: z.string(), count: z.number() })),
              priorityDistribution: z.array(z.object({ _id: z.string(), count: z.number() })),
              overdueSummary: z.object({ total: z.number(), overdue: z.number() }),
              workload: z.array(z.object({ _id: z.string(), assigned: z.number(), done: z.number() })),
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
    query: z.object({
      ...paginationQuery,
      taskId: z.string().optional().openapi({
        param: { name: 'taskId', in: 'query', description: 'Filter by task id' },
        example: '507f1f77bcf86cd799439011',
      }),
      search: z.string().optional().openapi({
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
          schema: z.object({
            taskId: z.string().openapi({ example: '507f1f77bcf86cd799439011' }),
            content: z.string().min(1).openapi({ example: 'Looks good to me' }),
            parentId: z.string().optional().openapi({ example: '507f1f77bcf86cd799439011' }),
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
    params: z.object({ id: idParam }),
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
    params: z.object({ id: idParam }),
    body: {
      description: 'Comment update payload',
      content: {
        'application/json': {
          schema: z.object({
            content: z.string().min(1).openapi({ example: 'Updated comment content' }),
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
    params: z.object({ id: idParam }),
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
    query: z.object({
      ...paginationQuery,
      isRead: z.enum(['true', 'false']).optional().openapi({
        param: { name: 'isRead', in: 'query', description: 'Filter by read status' },
        example: 'false',
      }),
      type: z
        .enum(['task-assigned', 'task-updated', 'comment-added', 'project-created', 'mention', 'due-soon', 'invite'])
        .optional()
        .openapi({
          param: { name: 'type', in: 'query', description: 'Filter by notification type' },
          example: 'task-assigned',
        }),
      search: z.string().optional().openapi({
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
          schema: z.object({
            success: z.literal(true),
            data: z.object({
              unreadCountsByType: z.array(z.object({ _id: z.string(), count: z.number() })),
              deliveryStats: z.array(z.object({ _id: z.string(), count: z.number() })),
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
    params: z.object({ id: idParam }),
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
    query: z.object(paginationQuery),
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
          schema: z.object({
            name: z.string().min(1).openapi({ example: 'CI deployment key' }),
            scopes: z.array(z.enum(['read', 'write', 'admin'])).optional().openapi({ example: ['read', 'write'] }),
            expiresInDays: z.number().min(1).max(365).optional().openapi({ example: 365 }),
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
          schema: z.object({
            success: z.literal(true),
            data: z.object({
              apiKey: ApiKeySchema,
              plaintextKey: z.string().openapi({ example: 'npak_a1b2c3d4_secretvalue' }),
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
    params: z.object({ id: idParam }),
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
          schema: z.string().openapi({ example: 'event: notification\ndata: {}\n\n' }),
        },
      },
    },
    401: errorResponse('Unauthorized'),
  },
});

/* ------------------------------------------------------------------ */
// Generator
/* ------------------------------------------------------------------ */

export const openApiDocument = new OpenApiGeneratorV3(registry.definitions).generateDocument({
  openapi: '3.0.0',
  info: {
    title: env.APP_NAME,
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
