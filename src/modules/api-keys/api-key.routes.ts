import { Router } from 'express';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validateMiddleware } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/asyncHandler';
import { apiKeyController } from './api-key.controller';
import { createApiKeySchema, revokeApiKeySchema } from './api-key.validation';

export const apiKeyRouter = Router();

apiKeyRouter.post(
  '/',
  authMiddleware,
  validateMiddleware(createApiKeySchema),
  asyncHandler(apiKeyController.create)
);

apiKeyRouter.get('/', authMiddleware, asyncHandler(apiKeyController.list));

apiKeyRouter.delete(
  '/:id',
  authMiddleware,
  validateMiddleware(revokeApiKeySchema),
  asyncHandler(apiKeyController.revoke)
);
