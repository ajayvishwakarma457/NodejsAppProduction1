import { z } from 'zod';

/* ------------------------------------------------------------------ */
// Body schemas
/* ------------------------------------------------------------------ */

export const createProjectSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Project name is required').max(100),
    description: z.string().min(1, 'Description is required').max(1000),
    status: z.enum(['active', 'completed', 'archived']).optional(),
    teamId: z.string().min(1, 'Team id is required'),
    startDate: z.string().datetime().optional().or(z.date().optional()),
    dueDate: z.string().datetime().optional().or(z.date().optional()),
  }),
});

export const updateProjectSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().min(1).max(1000).optional(),
    status: z.enum(['active', 'completed', 'archived']).optional(),
    teamId: z.string().min(1).optional(),
    startDate: z.string().datetime().optional().or(z.date().optional()),
    dueDate: z.string().datetime().optional().or(z.date().optional()),
  }),
  params: z.object({
    id: z.string().min(1, 'Project id is required'),
  }),
});

/* ------------------------------------------------------------------ */
// Query / route param schemas
/* ------------------------------------------------------------------ */

export const listProjectsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(10),
    sort: z.string().optional().default('createdAt'),
    order: z.enum(['asc', 'desc']).optional().default('desc'),
    status: z.enum(['active', 'completed', 'archived']).optional(),
    ownerId: z.string().optional(),
    teamId: z.string().optional(),
    search: z.string().optional(),
  }),
});

export const dashboardProjectsQuerySchema = z.object({
  query: z.object({}),
});

export const projectIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Project id is required'),
  }),
});
