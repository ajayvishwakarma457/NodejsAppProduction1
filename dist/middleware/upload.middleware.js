"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadMultipleMiddleware = exports.uploadMiddleware = void 0;
const multer_1 = __importDefault(require("multer"));
const http_status_codes_1 = require("http-status-codes");
const env_1 = require("../config/env");
const logger_1 = require("../config/logger");
const ApiError_1 = require("../utils/ApiError");
const storage_service_1 = require("../services/storage.service");
const ONE_MB = 1024 * 1024;
const MAX_FILE_SIZE = env_1.env.STORAGE_MAX_FILE_SIZE_MB * ONE_MB;
const limits = {
    fileSize: MAX_FILE_SIZE,
    files: 5,
    fields: 10,
    fieldNameSize: 100,
    fieldSize: 1 * ONE_MB,
    parts: 20,
};
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits,
    fileFilter: storage_service_1.storageService.multerFileFilter,
});
/**
 * Wraps a multer middleware to catch errors and convert them into
 * structured ApiError instances with request context logging.
 */
const handleUploadError = (multerFn) => (req, res, next) => {
    multerFn(req, res, (err) => {
        if (!err)
            return next();
        if (err instanceof multer_1.default.MulterError) {
            logger_1.logger.warn('Upload rejected', {
                method: req.method,
                url: req.originalUrl || req.url,
                requestId: req.requestId,
                userId: req.user?.id,
                code: err.code,
                field: err.field,
            });
            let message = 'File upload error';
            const status = http_status_codes_1.StatusCodes.BAD_REQUEST;
            switch (err.code) {
                case 'LIMIT_FILE_SIZE':
                    message = `File too large. Max size is ${env_1.env.STORAGE_MAX_FILE_SIZE_MB}MB`;
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
            return next(new ApiError_1.ApiError(status, message, { code: err.code, field: err.field }));
        }
        // Unknown upload error (e.g., rejected by custom fileFilter)
        if (err instanceof Error) {
            logger_1.logger.warn('Upload rejected by file filter', {
                method: req.method,
                url: req.originalUrl || req.url,
                requestId: req.requestId,
                userId: req.user?.id,
                error: err.message,
            });
            return next(ApiError_1.ApiError.badRequest(err.message));
        }
        next(err);
    });
};
exports.uploadMiddleware = handleUploadError(upload.single('file'));
exports.uploadMultipleMiddleware = handleUploadError(upload.array('files', 5));
//# sourceMappingURL=upload.middleware.js.map