"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileService = void 0;
const storage_service_1 = require("../../services/storage.service");
const ApiError_1 = require("../../utils/ApiError");
exports.fileService = {
    /**
     * Parse an HTTP Range header into start/end byte positions.
     * Supports `bytes=start-end`, `bytes=start-`, and `bytes=-suffix`.
     * Returns null if the range is unsatisfiable or not provided.
     */
    parseRange(rangeHeader, totalSize) {
        if (!rangeHeader || !rangeHeader.startsWith('bytes=')) {
            return null;
        }
        const rangeValue = rangeHeader.replace('bytes=', '');
        const [startStr, endStr] = rangeValue.split('-');
        // Suffix range: bytes=-500 means last 500 bytes
        if (startStr === '' && endStr) {
            const suffix = parseInt(endStr, 10);
            if (Number.isNaN(suffix) || suffix <= 0)
                return null;
            const start = Math.max(0, totalSize - suffix);
            return { start, end: totalSize - 1, total: totalSize };
        }
        const start = parseInt(startStr, 10);
        if (Number.isNaN(start) || start < 0 || start >= totalSize) {
            return null;
        }
        const end = endStr ? Math.min(parseInt(endStr, 10), totalSize - 1) : totalSize - 1;
        if (Number.isNaN(end) || end < start) {
            return null;
        }
        return { start, end, total: totalSize };
    },
    /**
     * Stream a file, optionally within a byte range.
     */
    async streamFile(key, rangeHeader) {
        const metadata = await storage_service_1.storageService.getMetadata(key);
        if (!metadata) {
            throw ApiError_1.ApiError.notFound('File not found');
        }
        const range = this.parseRange(rangeHeader, metadata.size);
        if (rangeHeader && !range) {
            throw ApiError_1.ApiError.rangeNotSatisfiable('Invalid range header');
        }
        const stream = range
            ? storage_service_1.storageService.getStream(key, range.start, range.end)
            : storage_service_1.storageService.getStream(key);
        return {
            stream,
            metadata,
            range,
        };
    },
    /**
     * Initiate a multipart upload and return the upload ID and key.
     */
    async initMultipartUpload(input) {
        const ext = input.fileName.includes('.')
            ? input.fileName.slice(input.fileName.lastIndexOf('.'))
            : '.bin';
        const key = storage_service_1.storageService.generateKey(`multipart${ext}`, input.folder ?? 'general');
        const result = await storage_service_1.storageService.createMultipartUpload(key, {
            originalName: input.fileName,
            contentType: input.contentType ?? 'application/octet-stream',
        });
        return {
            uploadId: result.uploadId,
            key: result.key,
            url: storage_service_1.storageService.getUrl(result.key),
        };
    },
    /**
     * Generate a presigned URL for a specific multipart part.
     */
    async getMultipartUploadUrl(uploadId, key, partNumber) {
        if (partNumber < 1 || partNumber > 10000) {
            throw ApiError_1.ApiError.badRequest('Part number must be between 1 and 10000');
        }
        const url = await storage_service_1.storageService.getMultipartUploadUrl(uploadId, key, partNumber);
        return { url, partNumber };
    },
    /**
     * Complete a multipart upload by assembling all parts.
     */
    async completeMultipartUpload(input) {
        if (!input.parts || input.parts.length === 0) {
            throw ApiError_1.ApiError.badRequest('At least one part is required');
        }
        const result = await storage_service_1.storageService.completeMultipartUpload(input.uploadId, input.key, input.parts);
        return {
            key: result.key,
            url: result.url,
        };
    },
    /**
     * Abort a multipart upload and discard uploaded parts.
     */
    async abortMultipartUpload(input) {
        await storage_service_1.storageService.abortMultipartUpload(input.uploadId, input.key);
    },
};
//# sourceMappingURL=file.service.js.map