import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validateMiddleware } from '../../middleware/validate.middleware';
import { fileController } from './file.controller';
import {
  streamFileSchema,
  initMultipartUploadSchema,
  multipartUploadUrlSchema,
  completeMultipartUploadSchema,
  abortMultipartUploadSchema,
} from './file.validation';

export const fileRouter = Router();

fileRouter.use(authMiddleware);

/* ------------------------------------------------------------------ */
// Streaming downloads
/* ------------------------------------------------------------------ */

fileRouter.get(
  '/:key/stream',
  validateMiddleware(streamFileSchema),
  asyncHandler(fileController.stream)
);

/* ------------------------------------------------------------------ */
// Multipart uploads (direct-to-S3)
/* ------------------------------------------------------------------ */

fileRouter.post(
  '/multipart/init',
  validateMiddleware(initMultipartUploadSchema),
  asyncHandler(fileController.initMultipartUpload)
);

fileRouter.post(
  '/multipart/url',
  validateMiddleware(multipartUploadUrlSchema),
  asyncHandler(fileController.getMultipartUploadUrl)
);

fileRouter.post(
  '/multipart/complete',
  validateMiddleware(completeMultipartUploadSchema),
  asyncHandler(fileController.completeMultipartUpload)
);

fileRouter.post(
  '/multipart/abort',
  validateMiddleware(abortMultipartUploadSchema),
  asyncHandler(fileController.abortMultipartUpload)
);
