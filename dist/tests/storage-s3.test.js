"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const aws_sdk_client_mock_1 = require("aws-sdk-client-mock");
const stream_1 = require("stream");
const storage_service_1 = require("../services/storage.service");
vitest_1.vi.mock('../config/env', () => ({
    env: {
        STORAGE_PROVIDER: 's3',
        STORAGE_LOCAL_PATH: 'uploads',
        STORAGE_MAX_FILE_SIZE_MB: 10,
        STORAGE_ALLOWED_MIME_TYPES: 'image/jpeg,image/png,application/pdf',
        AWS_REGION: 'us-east-1',
        AWS_ACCESS_KEY_ID: 'test-access-key',
        AWS_SECRET_ACCESS_KEY: 'test-secret-key',
        S3_BUCKET_NAME: 'test-bucket',
        S3_ENDPOINT: undefined,
        S3_FORCE_PATH_STYLE: false,
        S3_PUBLIC_URL: undefined,
    },
}));
vitest_1.vi.mock('@aws-sdk/s3-request-presigner', () => ({
    getSignedUrl: vitest_1.vi.fn(),
}));
(0, vitest_1.describe)('S3StorageProvider', () => {
    const s3Mock = (0, aws_sdk_client_mock_1.mockClient)(client_s3_1.S3Client);
    (0, vitest_1.beforeEach)(() => {
        s3Mock.reset();
        vitest_1.vi.mocked(s3_request_presigner_1.getSignedUrl).mockReset();
    });
    (0, vitest_1.afterEach)(() => {
        s3Mock.restore();
    });
    const createProvider = () => new storage_service_1.S3StorageProvider(s3Mock);
    (0, vitest_1.it)('should upload a file to S3', async () => {
        s3Mock.on(client_s3_1.PutObjectCommand).resolves({});
        const provider = createProvider();
        const file = {
            fieldname: 'file',
            originalname: 'photo.jpg',
            encoding: '7bit',
            mimetype: 'image/jpeg',
            size: 1024,
            buffer: Buffer.from('fake-image'),
        };
        const result = await provider.upload(file, 'avatars');
        (0, vitest_1.expect)(result.key).toContain('avatars/');
        (0, vitest_1.expect)(result.key).toContain('.jpg');
        (0, vitest_1.expect)(result.url).toBe(`https://test-bucket.s3.us-east-1.amazonaws.com/${result.key}`);
        (0, vitest_1.expect)(result.size).toBe(1024);
        (0, vitest_1.expect)(result.mimetype).toBe('image/jpeg');
        (0, vitest_1.expect)(result.originalName).toBe('photo.jpg');
        const calls = s3Mock.commandCalls(client_s3_1.PutObjectCommand);
        (0, vitest_1.expect)(calls).toHaveLength(1);
        (0, vitest_1.expect)(calls[0].args[0].input.Bucket).toBe('test-bucket');
        (0, vitest_1.expect)(calls[0].args[0].input.Key).toBe(result.key);
        (0, vitest_1.expect)(calls[0].args[0].input.ContentType).toBe('image/jpeg');
    });
    (0, vitest_1.it)('should delete a file from S3', async () => {
        s3Mock.on(client_s3_1.DeleteObjectCommand).resolves({});
        const provider = createProvider();
        const deleted = await provider.delete('avatars/photo.jpg');
        (0, vitest_1.expect)(deleted).toBe(true);
        const calls = s3Mock.commandCalls(client_s3_1.DeleteObjectCommand);
        (0, vitest_1.expect)(calls[0].args[0].input.Bucket).toBe('test-bucket');
        (0, vitest_1.expect)(calls[0].args[0].input.Key).toBe('avatars/photo.jpg');
    });
    (0, vitest_1.it)('should return true when file exists in S3', async () => {
        s3Mock.on(client_s3_1.HeadObjectCommand).resolves({});
        const provider = createProvider();
        const exists = await provider.exists('avatars/photo.jpg');
        (0, vitest_1.expect)(exists).toBe(true);
    });
    (0, vitest_1.it)('should return false when file does not exist in S3', async () => {
        const notFoundError = new client_s3_1.S3ServiceException({
            name: 'NotFound',
            message: 'Not Found',
            $fault: 'client',
            $metadata: {},
        });
        s3Mock.on(client_s3_1.HeadObjectCommand).rejects(notFoundError);
        const provider = createProvider();
        const exists = await provider.exists('avatars/missing.jpg');
        (0, vitest_1.expect)(exists).toBe(false);
    });
    (0, vitest_1.it)('should throw ApiError when S3 upload fails', async () => {
        const s3Error = new client_s3_1.S3ServiceException({
            name: 'AccessDenied',
            message: 'Access Denied',
            $fault: 'client',
            $metadata: {},
        });
        s3Mock.on(client_s3_1.PutObjectCommand).rejects(s3Error);
        const provider = createProvider();
        const file = {
            fieldname: 'file',
            originalname: 'photo.jpg',
            encoding: '7bit',
            mimetype: 'image/jpeg',
            size: 1024,
            buffer: Buffer.from('fake-image'),
        };
        await (0, vitest_1.expect)(provider.upload(file)).rejects.toThrow('S3 upload failed');
    });
    (0, vitest_1.it)('should get file metadata from S3', async () => {
        s3Mock.on(client_s3_1.HeadObjectCommand).resolves({
            ContentLength: 2048,
            ContentType: 'image/png',
            LastModified: new Date('2026-01-01'),
        });
        const provider = createProvider();
        const metadata = await provider.getMetadata('avatars/photo.png');
        (0, vitest_1.expect)(metadata).toEqual({
            size: 2048,
            mimetype: 'image/png',
            lastModified: new Date('2026-01-01'),
        });
    });
    (0, vitest_1.it)('should return null metadata when file does not exist in S3', async () => {
        const notFoundError = new client_s3_1.S3ServiceException({
            name: 'NotFound',
            message: 'Not Found',
            $fault: 'client',
            $metadata: {},
        });
        s3Mock.on(client_s3_1.HeadObjectCommand).rejects(notFoundError);
        const provider = createProvider();
        const metadata = await provider.getMetadata('avatars/missing.png');
        (0, vitest_1.expect)(metadata).toBeNull();
    });
    (0, vitest_1.it)('should generate public S3 URL', () => {
        const provider = createProvider();
        const url = provider.getUrl('avatars/photo.jpg');
        (0, vitest_1.expect)(url).toBe('https://test-bucket.s3.us-east-1.amazonaws.com/avatars/photo.jpg');
    });
    (0, vitest_1.it)('should use S3_PUBLIC_URL when configured', async () => {
        const { env } = await Promise.resolve().then(() => __importStar(require('../config/env')));
        env.S3_PUBLIC_URL = 'https://cdn.example.com';
        const provider = createProvider();
        const url = provider.getUrl('avatars/photo.jpg');
        (0, vitest_1.expect)(url).toBe('https://cdn.example.com/avatars/photo.jpg');
        env.S3_PUBLIC_URL = undefined;
    });
    (0, vitest_1.it)('should generate a signed URL', async () => {
        vitest_1.vi.mocked(s3_request_presigner_1.getSignedUrl).mockResolvedValue('https://signed-url.example.com');
        const provider = createProvider();
        const url = await provider.getSignedUrl('avatars/photo.jpg', 3600);
        (0, vitest_1.expect)(url).toBe('https://signed-url.example.com');
        (0, vitest_1.expect)(s3_request_presigner_1.getSignedUrl).toHaveBeenCalledWith(vitest_1.expect.any(Object), vitest_1.expect.any(client_s3_1.GetObjectCommand), {
            expiresIn: 3600,
        });
    });
    (0, vitest_1.it)('should stream a file from S3', async () => {
        const stream = stream_1.Readable.from(['hello world']);
        s3Mock.on(client_s3_1.GetObjectCommand).resolves({ Body: stream });
        const provider = createProvider();
        const resultStream = provider.getStream('avatars/photo.jpg');
        const chunks = [];
        for await (const chunk of resultStream) {
            chunks.push(Buffer.from(chunk));
        }
        (0, vitest_1.expect)(Buffer.concat(chunks).toString()).toBe('hello world');
    });
    (0, vitest_1.it)('should stream a byte range from S3', async () => {
        const stream = stream_1.Readable.from(['world']);
        s3Mock.on(client_s3_1.GetObjectCommand).resolves({ Body: stream });
        const provider = createProvider();
        const resultStream = provider.getStream('avatars/photo.jpg', 6, 10);
        const chunks = [];
        for await (const chunk of resultStream) {
            chunks.push(Buffer.from(chunk));
        }
        (0, vitest_1.expect)(Buffer.concat(chunks).toString()).toBe('world');
        const calls = s3Mock.commandCalls(client_s3_1.GetObjectCommand);
        (0, vitest_1.expect)(calls[0].args[0].input.Range).toBe('bytes=6-10');
    });
    (0, vitest_1.it)('should initiate a multipart upload', async () => {
        s3Mock.on(client_s3_1.CreateMultipartUploadCommand).resolves({ UploadId: 'upload-123' });
        const provider = createProvider();
        const result = await provider.createMultipartUpload('videos/movie.mp4', {
            contentType: 'video/mp4',
        });
        (0, vitest_1.expect)(result.uploadId).toBe('upload-123');
        (0, vitest_1.expect)(result.key).toBe('videos/movie.mp4');
        const calls = s3Mock.commandCalls(client_s3_1.CreateMultipartUploadCommand);
        (0, vitest_1.expect)(calls[0].args[0].input.Bucket).toBe('test-bucket');
        (0, vitest_1.expect)(calls[0].args[0].input.Key).toBe('videos/movie.mp4');
    });
    (0, vitest_1.it)('should generate a multipart upload presigned URL', async () => {
        vitest_1.vi.mocked(s3_request_presigner_1.getSignedUrl).mockResolvedValue('https://part-upload.example.com');
        const provider = createProvider();
        const url = await provider.getMultipartUploadUrl('upload-123', 'videos/movie.mp4', 1);
        (0, vitest_1.expect)(url).toBe('https://part-upload.example.com');
        (0, vitest_1.expect)(s3_request_presigner_1.getSignedUrl).toHaveBeenCalledWith(vitest_1.expect.any(Object), vitest_1.expect.any(client_s3_1.UploadPartCommand), {
            expiresIn: 3600,
        });
    });
    (0, vitest_1.it)('should complete a multipart upload', async () => {
        s3Mock.on(client_s3_1.CompleteMultipartUploadCommand).resolves({});
        const provider = createProvider();
        const result = await provider.completeMultipartUpload('upload-123', 'videos/movie.mp4', [
            { ETag: '"etag-1"', PartNumber: 1 },
            { ETag: '"etag-2"', PartNumber: 2 },
        ]);
        (0, vitest_1.expect)(result.key).toBe('videos/movie.mp4');
        (0, vitest_1.expect)(result.url).toBe('https://test-bucket.s3.us-east-1.amazonaws.com/videos/movie.mp4');
        const calls = s3Mock.commandCalls(client_s3_1.CompleteMultipartUploadCommand);
        (0, vitest_1.expect)(calls[0].args[0].input.UploadId).toBe('upload-123');
        (0, vitest_1.expect)(calls[0].args[0].input.MultipartUpload?.Parts).toHaveLength(2);
    });
    (0, vitest_1.it)('should abort a multipart upload', async () => {
        s3Mock.on(client_s3_1.AbortMultipartUploadCommand).resolves({});
        const provider = createProvider();
        await (0, vitest_1.expect)(provider.abortMultipartUpload('upload-123', 'videos/movie.mp4')).resolves.toBeUndefined();
        const calls = s3Mock.commandCalls(client_s3_1.AbortMultipartUploadCommand);
        (0, vitest_1.expect)(calls[0].args[0].input.UploadId).toBe('upload-123');
    });
});
//# sourceMappingURL=storage-s3.test.js.map