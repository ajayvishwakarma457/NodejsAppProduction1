"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.abortMultipartUploadSchema = exports.completeMultipartUploadSchema = exports.multipartUploadUrlSchema = exports.initMultipartUploadSchema = exports.streamFileSchema = void 0;
const zod_1 = require("zod");
exports.streamFileSchema = zod_1.z.object({
    params: zod_1.z.object({
        key: zod_1.z.string().min(1, 'File key is required'),
    }),
});
exports.initMultipartUploadSchema = zod_1.z.object({
    body: zod_1.z.object({
        fileName: zod_1.z.string().min(1, 'File name is required').max(255),
        folder: zod_1.z.string().max(100).optional(),
        contentType: zod_1.z.string().max(100).optional(),
    }),
});
exports.multipartUploadUrlSchema = zod_1.z.object({
    body: zod_1.z.object({
        uploadId: zod_1.z.string().min(1, 'Upload ID is required'),
        key: zod_1.z.string().min(1, 'File key is required'),
        partNumber: zod_1.z.coerce.number().min(1).max(10000),
    }),
});
exports.completeMultipartUploadSchema = zod_1.z.object({
    body: zod_1.z.object({
        uploadId: zod_1.z.string().min(1, 'Upload ID is required'),
        key: zod_1.z.string().min(1, 'File key is required'),
        parts: zod_1.z
            .array(zod_1.z.object({
            ETag: zod_1.z.string().min(1, 'ETag is required'),
            PartNumber: zod_1.z.coerce.number().min(1).max(10000),
        }))
            .min(1, 'At least one part is required'),
    }),
});
exports.abortMultipartUploadSchema = zod_1.z.object({
    body: zod_1.z.object({
        uploadId: zod_1.z.string().min(1, 'Upload ID is required'),
        key: zod_1.z.string().min(1, 'File key is required'),
    }),
});
//# sourceMappingURL=file.validation.js.map