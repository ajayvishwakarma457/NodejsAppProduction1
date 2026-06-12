"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileController = void 0;
const http_status_codes_1 = require("http-status-codes");
const file_service_1 = require("./file.service");
const ApiResponse_1 = require("../../utils/ApiResponse");
const TWO_WEEKS_SECONDS = 14 * 24 * 60 * 60;
exports.fileController = {
    /**
     * Stream a file with optional HTTP Range support.
     * Works for both local and S3 storage providers.
     */
    async stream(req, res) {
        const key = decodeURIComponent(req.params.key);
        const rangeHeader = req.headers.range;
        const { stream, metadata, range } = await file_service_1.fileService.streamFile(key, rangeHeader);
        const headers = {
            'Content-Type': metadata.mimetype,
            'Accept-Ranges': 'bytes',
            'Cache-Control': `public, max-age=${TWO_WEEKS_SECONDS}`,
        };
        if (range) {
            res.status(http_status_codes_1.StatusCodes.PARTIAL_CONTENT);
            headers['Content-Range'] = `bytes ${range.start}-${range.end}/${range.total}`;
            headers['Content-Length'] = String(range.end - range.start + 1);
        }
        else {
            headers['Content-Length'] = String(metadata.size);
        }
        Object.entries(headers).forEach(([name, value]) => res.setHeader(name, value));
        // Handle stream errors gracefully
        stream.on('error', (err) => {
            // If headers are already sent, we can only destroy the connection
            if (res.headersSent) {
                res.destroy();
                return;
            }
            res.status(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: err.message || 'Stream error',
            });
        });
        stream.pipe(res);
    },
    /**
     * Initiate a multipart upload.
     */
    async initMultipartUpload(req, res) {
        const result = await file_service_1.fileService.initMultipartUpload(req.body);
        ApiResponse_1.ApiResponse.created(result, 'Multipart upload initiated').send(res);
    },
    /**
     * Generate a presigned URL for a multipart part.
     */
    async getMultipartUploadUrl(req, res) {
        const { uploadId, key, partNumber } = req.body;
        const result = await file_service_1.fileService.getMultipartUploadUrl(uploadId, key, partNumber);
        ApiResponse_1.ApiResponse.ok(result).send(res);
    },
    /**
     * Complete a multipart upload.
     */
    async completeMultipartUpload(req, res) {
        const result = await file_service_1.fileService.completeMultipartUpload(req.body);
        ApiResponse_1.ApiResponse.ok(result, 'Multipart upload completed').send(res);
    },
    /**
     * Abort a multipart upload.
     */
    async abortMultipartUpload(req, res) {
        await file_service_1.fileService.abortMultipartUpload(req.body);
        ApiResponse_1.ApiResponse.noContent('Multipart upload aborted').send(res);
    },
};
//# sourceMappingURL=file.controller.js.map