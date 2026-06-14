"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.storageService = exports.S3StorageProvider = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
const stream_1 = require("stream");
const util_1 = require("util");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const env_1 = require("../config/env");
const logger_1 = require("../config/logger");
const ApiError_1 = require("../utils/ApiError");
const image_processor_1 = require("../utils/image-processor");
const statAsync = (0, util_1.promisify)(fs_1.stat);
/* ─────────────── Local Provider ─────────────── */
class LocalStorageProvider {
    basePath;
    publicUrl;
    constructor() {
        this.basePath = path_1.default.resolve(env_1.env.STORAGE_LOCAL_PATH);
        this.publicUrl = '/uploads';
    }
    resolvePath(key) {
        // Prevent directory traversal
        const clean = key.replace(/\.\./g, '').replace(/^\/+/g, '');
        return path_1.default.join(this.basePath, clean);
    }
    async upload(file, folder = 'general') {
        const timestamp = Date.now();
        const ext = path_1.default.extname(file.originalname) || '.bin';
        const safeName = `${timestamp}-${Math.random().toString(36).slice(2, 10)}${ext}`;
        const key = path_1.default.join(folder, safeName).replace(/\\/g, '/');
        const destPath = this.resolvePath(key);
        await promises_1.default.mkdir(path_1.default.dirname(destPath), { recursive: true });
        if (file.buffer) {
            await promises_1.default.writeFile(destPath, file.buffer);
        }
        else if (file.path) {
            await promises_1.default.copyFile(file.path, destPath);
        }
        else {
            throw ApiError_1.ApiError.internal('No file buffer or path available');
        }
        // Persist metadata in a sidecar so getMetadata can return the original mimetype.
        const metaPath = `${destPath}.meta.json`;
        await promises_1.default.writeFile(metaPath, JSON.stringify({
            size: file.size,
            mimetype: file.mimetype,
            originalName: file.originalname,
        }));
        logger_1.logger.info('File uploaded (local)', { key, size: file.size });
        return {
            key,
            url: this.getUrl(key),
            size: file.size,
            mimetype: file.mimetype,
            originalName: file.originalname,
        };
    }
    async delete(key) {
        try {
            const filePath = this.resolvePath(key);
            await promises_1.default.unlink(filePath);
            // Best-effort cleanup of sidecar metadata; failures are ignored.
            await promises_1.default.unlink(`${filePath}.meta.json`).catch(() => undefined);
            logger_1.logger.info('File deleted (local)', { key });
            return true;
        }
        catch {
            return false;
        }
    }
    async exists(key) {
        try {
            await promises_1.default.access(this.resolvePath(key));
            return true;
        }
        catch {
            return false;
        }
    }
    async getMetadata(key) {
        const filePath = this.resolvePath(key);
        const metaPath = `${filePath}.meta.json`;
        try {
            // Prefer persisted sidecar metadata so the original mimetype is preserved.
            const metaRaw = await promises_1.default.readFile(metaPath, 'utf-8');
            const meta = JSON.parse(metaRaw);
            const stats = await statAsync(filePath);
            return {
                size: meta.size ?? stats.size,
                mimetype: meta.mimetype ?? 'application/octet-stream',
                lastModified: stats.mtime,
            };
        }
        catch {
            // Fall back to filesystem stats if metadata is missing.
            try {
                const stats = await statAsync(filePath);
                return {
                    size: stats.size,
                    mimetype: 'application/octet-stream',
                    lastModified: stats.mtime,
                };
            }
            catch {
                return null;
            }
        }
    }
    getStream(key, start, end) {
        const options = {};
        if (start !== undefined)
            options.start = start;
        if (end !== undefined)
            options.end = end;
        return (0, fs_1.createReadStream)(this.resolvePath(key), options);
    }
    getUrl(key) {
        return `${this.publicUrl}/${key.replace(/\\/g, '/')}`;
    }
    async getSignedUrl(key, _expiresInSeconds = 3600) {
        // Local files are served publicly; signed URLs are not needed.
        return this.getUrl(key);
    }
    async createMultipartUpload() {
        throw ApiError_1.ApiError.internal('Multipart uploads are not supported for local storage provider');
    }
    async getMultipartUploadUrl() {
        throw ApiError_1.ApiError.internal('Multipart uploads are not supported for local storage provider');
    }
    async completeMultipartUpload() {
        throw ApiError_1.ApiError.internal('Multipart uploads are not supported for local storage provider');
    }
    async abortMultipartUpload() {
        throw ApiError_1.ApiError.internal('Multipart uploads are not supported for local storage provider');
    }
}
/* ─────────────── S3 Provider ─────────────── */
class S3StorageProvider {
    client;
    bucket;
    constructor(client) {
        this.validateConfig();
        this.bucket = env_1.env.S3_BUCKET_NAME;
        this.client =
            client ??
                new client_s3_1.S3Client({
                    region: env_1.env.AWS_REGION,
                    credentials: {
                        accessKeyId: env_1.env.AWS_ACCESS_KEY_ID,
                        secretAccessKey: env_1.env.AWS_SECRET_ACCESS_KEY,
                    },
                    endpoint: env_1.env.S3_ENDPOINT,
                    forcePathStyle: env_1.env.S3_FORCE_PATH_STYLE,
                });
    }
    validateConfig() {
        const required = {
            AWS_ACCESS_KEY_ID: env_1.env.AWS_ACCESS_KEY_ID,
            AWS_SECRET_ACCESS_KEY: env_1.env.AWS_SECRET_ACCESS_KEY,
            S3_BUCKET_NAME: env_1.env.S3_BUCKET_NAME,
        };
        const missing = Object.entries(required)
            .filter(([, value]) => !value)
            .map(([key]) => key);
        if (missing.length > 0) {
            throw new Error(`S3 storage provider is missing required environment variables: ${missing.join(', ')}`);
        }
    }
    mapS3Error(err, operation, key) {
        if (err instanceof client_s3_1.S3ServiceException) {
            logger_1.logger.error(`S3 ${operation} failed`, {
                key,
                code: err.name,
                message: err.message,
            });
            throw ApiError_1.ApiError.internal(`S3 ${operation} failed: ${err.name}`);
        }
        logger_1.logger.error(`S3 ${operation} failed`, {
            key,
            error: err instanceof Error ? err.message : err,
        });
        throw ApiError_1.ApiError.internal(`S3 ${operation} failed`);
    }
    async upload(file, folder = 'general') {
        const timestamp = Date.now();
        const ext = path_1.default.extname(file.originalname) || '.bin';
        const safeName = `${timestamp}-${Math.random().toString(36).slice(2, 10)}${ext}`;
        const key = path_1.default.join(folder, safeName).replace(/\\/g, '/');
        const body = file.buffer ?? (file.path ? await promises_1.default.readFile(file.path) : undefined);
        if (!body) {
            throw ApiError_1.ApiError.internal('No file buffer or path available');
        }
        try {
            await this.client.send(new client_s3_1.PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                Body: body,
                ContentType: file.mimetype,
                ContentLength: file.size,
            }));
            logger_1.logger.info('File uploaded (S3)', { bucket: this.bucket, key, size: file.size });
            return {
                key,
                url: this.getUrl(key),
                size: file.size,
                mimetype: file.mimetype,
                originalName: file.originalname,
            };
        }
        catch (err) {
            this.mapS3Error(err, 'upload', key);
        }
    }
    async delete(key) {
        try {
            await this.client.send(new client_s3_1.DeleteObjectCommand({
                Bucket: this.bucket,
                Key: key,
            }));
            logger_1.logger.info('File deleted (S3)', { bucket: this.bucket, key });
            return true;
        }
        catch (err) {
            this.mapS3Error(err, 'delete', key);
        }
    }
    async exists(key) {
        try {
            await this.client.send(new client_s3_1.HeadObjectCommand({
                Bucket: this.bucket,
                Key: key,
            }));
            return true;
        }
        catch (err) {
            if (err instanceof client_s3_1.S3ServiceException && err.name === 'NotFound') {
                return false;
            }
            this.mapS3Error(err, 'exists', key);
        }
    }
    async getMetadata(key) {
        try {
            const result = await this.client.send(new client_s3_1.HeadObjectCommand({
                Bucket: this.bucket,
                Key: key,
            }));
            return {
                size: result.ContentLength ?? 0,
                mimetype: result.ContentType ?? 'application/octet-stream',
                lastModified: result.LastModified,
            };
        }
        catch (err) {
            if (err instanceof client_s3_1.S3ServiceException && err.name === 'NotFound') {
                return null;
            }
            this.mapS3Error(err, 'getMetadata', key);
        }
    }
    getStream(key, start, end) {
        const passThrough = new stream_1.PassThrough();
        const range = start !== undefined && end !== undefined ? `bytes=${start}-${end}` : undefined;
        this.client
            .send(new client_s3_1.GetObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Range: range,
        }))
            .then((response) => {
            if (!response.Body) {
                passThrough.destroy(ApiError_1.ApiError.notFound('File not found'));
                return;
            }
            response.Body.pipe(passThrough);
        })
            .catch((err) => {
            passThrough.destroy(err);
        });
        return passThrough;
    }
    getUrl(key) {
        if (env_1.env.S3_PUBLIC_URL) {
            const base = env_1.env.S3_PUBLIC_URL.replace(/\/$/, '');
            return `${base}/${key.replace(/^\/+/g, '')}`;
        }
        if (env_1.env.S3_ENDPOINT) {
            const base = env_1.env.S3_ENDPOINT.replace(/\/$/, '');
            if (env_1.env.S3_FORCE_PATH_STYLE) {
                return `${base}/${this.bucket}/${key.replace(/^\/+/g, '')}`;
            }
            return `${base}/${key.replace(/^\/+/g, '')}`;
        }
        // Standard AWS virtual-hosted style URL
        return `https://${this.bucket}.s3.${env_1.env.AWS_REGION}.amazonaws.com/${key.replace(/^\/+/g, '')}`;
    }
    async getSignedUrl(key, expiresInSeconds = 3600) {
        try {
            return await (0, s3_request_presigner_1.getSignedUrl)(this.client, new client_s3_1.GetObjectCommand({
                Bucket: this.bucket,
                Key: key,
            }), { expiresIn: expiresInSeconds });
        }
        catch (err) {
            this.mapS3Error(err, 'getSignedUrl', key);
        }
    }
    async createMultipartUpload(key, metadata) {
        try {
            const result = await this.client.send(new client_s3_1.CreateMultipartUploadCommand({
                Bucket: this.bucket,
                Key: key,
                Metadata: metadata,
            }));
            if (!result.UploadId) {
                throw ApiError_1.ApiError.internal('S3 did not return an upload ID');
            }
            logger_1.logger.info('Multipart upload initiated (S3)', { bucket: this.bucket, key });
            return {
                uploadId: result.UploadId,
                key,
            };
        }
        catch (err) {
            this.mapS3Error(err, 'createMultipartUpload', key);
        }
    }
    async getMultipartUploadUrl(uploadId, key, partNumber, expiresInSeconds = 3600) {
        try {
            return await (0, s3_request_presigner_1.getSignedUrl)(this.client, new client_s3_1.UploadPartCommand({
                Bucket: this.bucket,
                Key: key,
                UploadId: uploadId,
                PartNumber: partNumber,
            }), { expiresIn: expiresInSeconds });
        }
        catch (err) {
            this.mapS3Error(err, 'getMultipartUploadUrl', key);
        }
    }
    async completeMultipartUpload(uploadId, key, parts) {
        try {
            await this.client.send(new client_s3_1.CompleteMultipartUploadCommand({
                Bucket: this.bucket,
                Key: key,
                UploadId: uploadId,
                MultipartUpload: {
                    Parts: parts
                        .slice()
                        .sort((a, b) => a.PartNumber - b.PartNumber)
                        .map((part) => ({
                        ETag: part.ETag,
                        PartNumber: part.PartNumber,
                    })),
                },
            }));
            logger_1.logger.info('Multipart upload completed (S3)', { bucket: this.bucket, key });
            return {
                key,
                url: this.getUrl(key),
            };
        }
        catch (err) {
            this.mapS3Error(err, 'completeMultipartUpload', key);
        }
    }
    async abortMultipartUpload(uploadId, key) {
        try {
            await this.client.send(new client_s3_1.AbortMultipartUploadCommand({
                Bucket: this.bucket,
                Key: key,
                UploadId: uploadId,
            }));
            logger_1.logger.info('Multipart upload aborted (S3)', { bucket: this.bucket, key });
        }
        catch (err) {
            this.mapS3Error(err, 'abortMultipartUpload', key);
        }
    }
}
exports.S3StorageProvider = S3StorageProvider;
/* ─────────────── Factory ─────────────── */
const createProvider = () => {
    switch (env_1.env.STORAGE_PROVIDER) {
        case 's3':
            return new S3StorageProvider();
        case 'local':
        default:
            return new LocalStorageProvider();
    }
};
let providerInstance = null;
const getProvider = () => {
    if (!providerInstance) {
        providerInstance = createProvider();
    }
    return providerInstance;
};
/* ─────────────── Service API ─────────────── */
exports.storageService = {
    /** Upload a file to the configured provider. */
    async upload(file, folder) {
        if (env_1.env.IMAGE_PROCESSING_ENABLED && (0, image_processor_1.isImage)(file.mimetype) && file.buffer) {
            return this.uploadImageWithVariants(file, folder);
        }
        return getProvider().upload(file, folder);
    },
    /**
     * Process an image and upload the master + variants.
     */
    async uploadImageWithVariants(file, folder = 'general') {
        const processed = await (0, image_processor_1.processImage)(file.buffer, file.originalname);
        const uploadProcessed = async (image, name) => {
            const result = await getProvider().upload({
                ...file,
                originalname: (0, image_processor_1.getProcessedFileName)(file.originalname, name),
                mimetype: image.mimetype,
                size: image.size,
                buffer: image.buffer,
            }, folder);
            return {
                name,
                key: result.key,
                url: result.url,
                width: image.width,
                height: image.height,
                size: image.size,
                mimetype: image.mimetype,
            };
        };
        const masterUpload = await uploadProcessed(processed.master, 'master');
        const variantUploads = await Promise.all(processed.variants.map((variant) => uploadProcessed(variant, variant.name)));
        return {
            key: masterUpload.key,
            url: masterUpload.url,
            size: masterUpload.size,
            mimetype: masterUpload.mimetype,
            originalName: file.originalname,
            width: processed.master.width,
            height: processed.master.height,
            variants: [masterUpload, ...variantUploads],
        };
    },
    /** Delete a file by its storage key. */
    async delete(key) {
        return getProvider().delete(key);
    },
    /** Check if a file exists. */
    async exists(key) {
        return getProvider().exists(key);
    },
    /** Get file metadata (size, mimetype, lastModified). */
    async getMetadata(key) {
        return getProvider().getMetadata(key);
    },
    /** Get a readable stream for a file, optionally constrained to a byte range. */
    getStream(key, start, end) {
        return getProvider().getStream(key, start, end);
    },
    /** Get the public URL for a file key. */
    getUrl(key) {
        return getProvider().getUrl(key);
    },
    /** Get a temporary signed URL for private access. */
    async getSignedUrl(key, expiresInSeconds) {
        return getProvider().getSignedUrl(key, expiresInSeconds);
    },
    /** Initiate a multipart upload. */
    async createMultipartUpload(key, metadata) {
        return getProvider().createMultipartUpload(key, metadata);
    },
    /** Get a presigned URL to upload a single multipart part. */
    async getMultipartUploadUrl(uploadId, key, partNumber, expiresInSeconds) {
        return getProvider().getMultipartUploadUrl(uploadId, key, partNumber, expiresInSeconds);
    },
    /** Complete a multipart upload by combining all uploaded parts. */
    async completeMultipartUpload(uploadId, key, parts) {
        return getProvider().completeMultipartUpload(uploadId, key, parts);
    },
    /** Abort a multipart upload and clean up uploaded parts. */
    async abortMultipartUpload(uploadId, key) {
        return getProvider().abortMultipartUpload(uploadId, key);
    },
    /** Validate file size and MIME type (used by multer or controllers). */
    validate(file) {
        const maxBytes = env_1.env.STORAGE_MAX_FILE_SIZE_MB * 1024 * 1024;
        if (file.size > maxBytes) {
            throw ApiError_1.ApiError.badRequest(`File size exceeds ${env_1.env.STORAGE_MAX_FILE_SIZE_MB}MB limit`);
        }
        const allowed = env_1.env.STORAGE_ALLOWED_MIME_TYPES.split(',').map((t) => t.trim().toLowerCase());
        if (!allowed.includes(file.mimetype.toLowerCase())) {
            throw ApiError_1.ApiError.badRequest(`File type "${file.mimetype}" is not allowed. Allowed: ${allowed.join(', ')}`);
        }
    },
    /** Generate a unique safe filename. */
    generateKey(originalName, folder = 'general') {
        const ext = path_1.default.extname(originalName) || '.bin';
        const timestamp = Date.now();
        const rand = Math.random().toString(36).slice(2, 10);
        return path_1.default.join(folder, `${timestamp}-${rand}${ext}`).replace(/\\/g, '/');
    },
    /** Multer file filter compatible with Express. */
    multerFileFilter(_req, file, cb) {
        const allowed = env_1.env.STORAGE_ALLOWED_MIME_TYPES.split(',').map((t) => t.trim().toLowerCase());
        if (allowed.includes(file.mimetype.toLowerCase())) {
            cb(null, true);
        }
        else {
            cb(new Error(`File type "${file.mimetype}" is not allowed. Allowed: ${allowed.join(', ')}`));
        }
    },
};
//# sourceMappingURL=storage.service.js.map