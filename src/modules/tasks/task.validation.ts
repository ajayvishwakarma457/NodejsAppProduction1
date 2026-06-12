import { z } from 'zod';

/* ------------------------------------------------------------------ */
// Body schemas
/* ------------------------------------------------------------------ */

export const createTaskSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Task title is required').max(200),
    description: z.string().min(1, 'Task description is required').max(2000),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional().default('medium'),
    status: z.enum(['todo', 'in-progress', 'review', 'done']).optional().default('todo'),
    projectId: z.string().min(1, 'Project id is required'),
    assignedTo: z.string().min(1, 'Assignee id is required'),
    dueDate: z.string().datetime().optional(),
    estimatedHours: z.coerce.number().min(0).optional().default(0),
    actualHours: z.coerce.number().min(0).optional().default(0),
  }),
});

export const updateTaskSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().min(1).max(2000).optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    status: z.enum(['todo', 'in-progress', 'review', 'done']).optional(),
    projectId: z.string().min(1).optional(),
    assignedTo: z.string().min(1).optional(),
    dueDate: z.string().datetime().optional(),
    estimatedHours: z.coerce.number().min(0).optional(),
    actualHours: z.coerce.number().min(0).optional(),
  }),
  params: z.object({
    id: z.string().min(1, 'Task id is required'),
  }),
});

/* ------------------------------------------------------------------ */
// Query / route param schemas
/* ------------------------------------------------------------------ */

export const listTasksQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(10),
    sort: z.string().optional().default('createdAt'),
    order: z.enum(['asc', 'desc']).optional().default('desc'),
    projectId: z.string().optional(),
    assignedTo: z.string().optional(),
    createdBy: z.string().optional(),
    status: z.enum(['todo', 'in-progress', 'review', 'done']).optional(),
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    search: z.string().optional(),
  }),
});

export const dashboardTasksQuerySchema = z.object({
  query: z.object({}),
});

export const taskIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Task id is required'),
  }),
});
