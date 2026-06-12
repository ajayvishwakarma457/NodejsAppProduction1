"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileRouter = void 0;
const express_1 = require("express");
const asyncHandler_1 = require("../../utils/asyncHandler");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const validate_middleware_1 = require("../../middleware/validate.middleware");
const file_controller_1 = require("./file.controller");
const file_validation_1 = require("./file.validation");
exports.fileRouter = (0, express_1.Router)();
exports.fileRouter.use(auth_middleware_1.authMiddleware);
/* ------------------------------------------------------------------ */
// Streaming downloads
/* ------------------------------------------------------------------ */
exports.fileRouter.get('/:key/stream', (0, validate_middleware_1.validateMiddleware)(file_validation_1.streamFileSchema), (0, asyncHandler_1.asyncHandler)(file_controller_1.fileController.stream));
/* ------------------------------------------------------------------ */
// Multipart uploads (direct-to-S3)
/* ------------------------------------------------------------------ */
exports.fileRouter.post('/multipart/init', (0, validate_middleware_1.validateMiddleware)(file_validation_1.initMultipartUploadSchema), (0, asyncHandler_1.asyncHandler)(file_controller_1.fileController.initMultipartUpload));
exports.fileRouter.post('/multipart/url', (0, validate_middleware_1.validateMiddleware)(file_validation_1.multipartUploadUrlSchema), (0, asyncHandler_1.asyncHandler)(file_controller_1.fileController.getMultipartUploadUrl));
exports.fileRouter.post('/multipart/complete', (0, validate_middleware_1.validateMiddleware)(file_validation_1.completeMultipartUploadSchema), (0, asyncHandler_1.asyncHandler)(file_controller_1.fileController.completeMultipartUpload));
exports.fileRouter.post('/multipart/abort', (0, validate_middleware_1.validateMiddleware)(file_validation_1.abortMultipartUploadSchema), (0, asyncHandler_1.asyncHandler)(file_controller_1.fileController.abortMultipartUpload));
//# sourceMappingURL=file.routes.js.map