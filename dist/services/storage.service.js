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
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const env_1 = require("../config/env");
const logger_1 = require("../config/logger");
const ApiError_1 = require("../utils/ApiError");
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
    getStream(key) {
        return (0, fs_1.createReadStream)(this.resolvePath(key));
    }
    getUrl(key) {
        return `${this.publicUrl}/${key.replace(/\\/g, '/')}`;
    }
    async getSignedUrl(key, _expiresInSeconds = 3600) {
        // Local files are served publicly; signed URLs are not needed.
        return this.getUrl(key);
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
        logger_1.logger.error(`S3 ${operation} failed`, { key, error: err instanceof Error ? err.message : err });
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
    getStream(key) {
        // getObject is async; return a promise-wrapped stream is awkward,
        // so we expose a lazy getter that resolves on first read.
        const passThrough = new stream_1.PassThrough();
        this.client
            .send(new client_s3_1.GetObjectCommand({
            Bucket: this.bucket,
            Key: key,
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
        return getProvider().upload(file, folder);
    },
    /** Delete a file by its storage key. */
    async delete(key) {
        return getProvider().delete(key);
    },
    /** Check if a file exists. */
    async exists(key) {
        return getProvider().exists(key);
    },
    /** Get a readable stream for a file. */
    getStream(key) {
        return getProvider().getStream(key);
    },
    /** Get the public URL for a file key. */
    getUrl(key) {
        return getProvider().getUrl(key);
    },
    /** Get a temporary signed URL for private access. */
    async getSignedUrl(key, expiresInSeconds) {
        return getProvider().getSignedUrl(key, expiresInSeconds);
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