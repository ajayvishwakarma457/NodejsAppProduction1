"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const file_service_1 = require("../../modules/files/file.service");
const storage_service_1 = require("../../services/storage.service");
const ApiError_1 = require("../../utils/ApiError");
vitest_1.vi.mock('../../services/storage.service', () => ({
    storageService: {
        getMetadata: vitest_1.vi.fn(),
        getStream: vitest_1.vi.fn(),
        generateKey: vitest_1.vi.fn(),
        createMultipartUpload: vitest_1.vi.fn(),
        getMultipartUploadUrl: vitest_1.vi.fn(),
        completeMultipartUpload: vitest_1.vi.fn(),
        abortMultipartUpload: vitest_1.vi.fn(),
        getUrl: vitest_1.vi.fn(),
    },
}));
(0, vitest_1.describe)('fileService', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.describe)('parseRange', () => {
        (0, vitest_1.it)('returns null when no range header is provided', () => {
            (0, vitest_1.expect)(file_service_1.fileService.parseRange(undefined, 1000)).toBeNull();
        });
        (0, vitest_1.it)('parses a full byte range', () => {
            const range = file_service_1.fileService.parseRange('bytes=0-499', 1000);
            (0, vitest_1.expect)(range).toEqual({ start: 0, end: 499, total: 1000 });
        });
        (0, vitest_1.it)('parses an open-ended range', () => {
            const range = file_service_1.fileService.parseRange('bytes=500-', 1000);
            (0, vitest_1.expect)(range).toEqual({ start: 500, end: 999, total: 1000 });
        });
        (0, vitest_1.it)('parses a suffix range', () => {
            const range = file_service_1.fileService.parseRange('bytes=-100', 1000);
            (0, vitest_1.expect)(range).toEqual({ start: 900, end: 999, total: 1000 });
        });
        (0, vitest_1.it)('caps end at total size - 1', () => {
            const range = file_service_1.fileService.parseRange('bytes=0-2000', 1000);
            (0, vitest_1.expect)(range).toEqual({ start: 0, end: 999, total: 1000 });
        });
        (0, vitest_1.it)('returns null for invalid range', () => {
            (0, vitest_1.expect)(file_service_1.fileService.parseRange('bytes=1000-2000', 1000)).toBeNull();
            (0, vitest_1.expect)(file_service_1.fileService.parseRange('bytes=500-400', 1000)).toBeNull();
            (0, vitest_1.expect)(file_service_1.fileService.parseRange('bytes=abc-def', 1000)).toBeNull();
        });
    });
    (0, vitest_1.describe)('streamFile', () => {
        (0, vitest_1.it)('streams a full file when no range header is provided', async () => {
            const fakeStream = { pipe: vitest_1.vi.fn() };
            vitest_1.vi.mocked(storage_service_1.storageService.getMetadata).mockResolvedValue({
                size: 1024,
                mimetype: 'video/mp4',
            });
            vitest_1.vi.mocked(storage_service_1.storageService.getStream).mockReturnValue(fakeStream);
            const result = await file_service_1.fileService.streamFile('videos/movie.mp4');
            (0, vitest_1.expect)(result.metadata).toEqual({ size: 1024, mimetype: 'video/mp4' });
            (0, vitest_1.expect)(result.range).toBeNull();
            (0, vitest_1.expect)(storage_service_1.storageService.getStream).toHaveBeenCalledWith('videos/movie.mp4');
        });
        (0, vitest_1.it)('streams a byte range when range header is valid', async () => {
            const fakeStream = { pipe: vitest_1.vi.fn() };
            vitest_1.vi.mocked(storage_service_1.storageService.getMetadata).mockResolvedValue({
                size: 1024,
                mimetype: 'video/mp4',
            });
            vitest_1.vi.mocked(storage_service_1.storageService.getStream).mockReturnValue(fakeStream);
            const result = await file_service_1.fileService.streamFile('videos/movie.mp4', 'bytes=0-99');
            (0, vitest_1.expect)(result.range).toEqual({ start: 0, end: 99, total: 1024 });
            (0, vitest_1.expect)(storage_service_1.storageService.getStream).toHaveBeenCalledWith('videos/movie.mp4', 0, 99);
        });
        (0, vitest_1.it)('throws not found when metadata is null', async () => {
            vitest_1.vi.mocked(storage_service_1.storageService.getMetadata).mockResolvedValue(null);
            await (0, vitest_1.expect)(file_service_1.fileService.streamFile('videos/missing.mp4')).rejects.toThrow(ApiError_1.ApiError);
        });
        (0, vitest_1.it)('throws range not satisfiable for invalid range', async () => {
            vitest_1.vi.mocked(storage_service_1.storageService.getMetadata).mockResolvedValue({
                size: 100,
                mimetype: 'video/mp4',
            });
            await (0, vitest_1.expect)(file_service_1.fileService.streamFile('videos/movie.mp4', 'bytes=100-200')).rejects.toThrow('Invalid range header');
        });
    });
    (0, vitest_1.describe)('multipart uploads', () => {
        (0, vitest_1.it)('initiates a multipart upload', async () => {
            vitest_1.vi.mocked(storage_service_1.storageService.generateKey).mockReturnValue('videos/uuid-movie.mp4');
            vitest_1.vi.mocked(storage_service_1.storageService.createMultipartUpload).mockResolvedValue({
                uploadId: 'upload-123',
                key: 'videos/uuid-movie.mp4',
            });
            vitest_1.vi.mocked(storage_service_1.storageService.getUrl).mockReturnValue('https://test-bucket.s3.amazonaws.com/videos/uuid-movie.mp4');
            const result = await file_service_1.fileService.initMultipartUpload({
                fileName: 'movie.mp4',
                folder: 'videos',
                contentType: 'video/mp4',
            });
            (0, vitest_1.expect)(result.uploadId).toBe('upload-123');
            (0, vitest_1.expect)(result.key).toBe('videos/uuid-movie.mp4');
            (0, vitest_1.expect)(storage_service_1.storageService.createMultipartUpload).toHaveBeenCalledWith('videos/uuid-movie.mp4', vitest_1.expect.objectContaining({ contentType: 'video/mp4' }));
        });
        (0, vitest_1.it)('validates part number range', async () => {
            await (0, vitest_1.expect)(file_service_1.fileService.getMultipartUploadUrl('upload-123', 'videos/movie.mp4', 0)).rejects.toThrow('Part number must be between 1 and 10000');
            await (0, vitest_1.expect)(file_service_1.fileService.getMultipartUploadUrl('upload-123', 'videos/movie.mp4', 10001)).rejects.toThrow('Part number must be between 1 and 10000');
        });
        (0, vitest_1.it)('requires at least one part to complete upload', async () => {
            await (0, vitest_1.expect)(file_service_1.fileService.completeMultipartUpload({
                uploadId: 'upload-123',
                key: 'videos/movie.mp4',
                parts: [],
            })).rejects.toThrow('At least one part is required');
        });
    });
});
//# sourceMappingURL=file.service.test.js.map