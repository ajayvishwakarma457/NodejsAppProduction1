import { z } from 'zod';

/* ------------------------------------------------------------------ */
// Body schemas
/* ------------------------------------------------------------------ */

export const createCommentSchema = z.object({
  body: z.object({
    taskId: z.string().min(1, 'Task id is required'),
    content: z.string().min(1, 'Content is required').max(5000),
    parentId: z.string().min(1).optional(),
  }),
});

export const updateCommentSchema = z.object({
  body: z.object({
    content: z.string().min(1).max(5000),
  }),
  params: z.object({
    id: z.string().min(1, 'Comment id is required'),
  }),
});

/* ------------------------------------------------------------------ */
// Query / route param schemas
/* ------------------------------------------------------------------ */

export const listCommentsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(10),
    sort: z.string().optional().default('createdAt'),
    order: z.enum(['asc', 'desc']).optional().default('desc'),
    taskId: z.string().min(1).optional(),
    userId: z.string().min(1).optional(),
  }),
});

export const commentIdParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Comment id is required'),
  }),
});
