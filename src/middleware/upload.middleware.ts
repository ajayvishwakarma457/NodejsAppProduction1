import multer from 'multer';
import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { ApiError } from '../utils/ApiError';
import { storageService } from '../services/storage.service';

const ONE_MB = 1024 * 1024;
const MAX_FILE_SIZE = env.STORAGE_MAX_FILE_SIZE_MB * ONE_MB;

const limits: multer.Options['limits'] = {
  fileSize: MAX_FILE_SIZE,
  files: 5,
  fields: 10,
  fieldNameSize: 100,
  fieldSize: 1 * ONE_MB,
  parts: 20,
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits,
  fileFilter: storageService.multerFileFilter,
});

/**
 * Wraps a multer middleware to catch errors and convert them into
 * structured ApiError instances with request context logging.
 */
const handleUploadError =
  (multerFn: (req: Request, res: Response, next: NextFunction) => void) =>
  (req: Request, res: Response, next: NextFunction) => {
    multerFn(req, res, (err: unknown) => {
      if (!err) return next();

      if (err instanceof multer.MulterError) {
        logger.warn('Upload rejected', {
          method: req.method,
          url: req.originalUrl || req.url,
          requestId: req.requestId,
          userId: req.user?.id,
          code: err.code,
          field: err.field,
        });

        let message = 'File upload error';
        const status = StatusCodes.BAD_REQUEST;

        switch (err.code) {
          case 'LIMIT_FILE_SIZE':
            message = `File too large. Max size is ${env.STORAGE_MAX_FILE_SIZE_MB}MB`;
            break;
          case 'LIMIT_FILE_COUNT':
            message = `Too many files. Max allowed is ${limits.files}`;
            break;
          case 'LIMIT_UNEXPECTED_FILE':
            message = `Unexpected file field "${err.field}"`;
            break;
          case 'LIMIT_FIELD_KEY':
            message = 'Field name too long';
            break;
          case 'LIMIT_FIELD_VALUE':
            message = 'Field value too long';
            break;
          case 'LIMIT_FIELD_COUNT':
            message = 'Too many non-file fields';
            break;
          case 'LIMIT_PART_COUNT':
            message = 'Too many multipart parts';
            break;
        }

        return next(new ApiError(status, message, { code: err.code, field: err.field }));
      }

      // Unknown upload error (e.g., rejected by custom fileFilter)
      if (err instanceof Error) {
        logger.warn('Upload rejected by file filter', {
          method: req.method,
          url: req.originalUrl || req.url,
          requestId: req.requestId,
          userId: req.user?.id,
          error: err.message,
        });
        return next(ApiError.badRequest(err.message));
      }

      next(err);
    });
  };

export const uploadMiddleware = handleUploadError(upload.single('file'));
export const uploadMultipleMiddleware = handleUploadError(upload.array('files', 5));
