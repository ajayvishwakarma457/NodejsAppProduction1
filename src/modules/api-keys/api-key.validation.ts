import { z } from 'zod';
import { API_KEY_SCOPES } from './api-key.model';

/* ------------------------------------------------------------------ */
// Body schemas
/* ------------------------------------------------------------------ */

export const createApiKeySchema = z.object({
  body: z.object({
    name: z.string().min(1, 'API key name is required').max(100),
    scopes: z.array(z.enum(API_KEY_SCOPES)).min(1, 'At least one scope is required').optional(),
    expiresInDays: z.coerce.number().min(1).max(365).optional(),
  }),
});

/* ------------------------------------------------------------------ */
// Parameter schemas
/* ------------------------------------------------------------------ */

export const revokeApiKeySchema = z.object({
  params: z.object({
    id: z.string().min(1, 'API key ID is required'),
  }),
});
