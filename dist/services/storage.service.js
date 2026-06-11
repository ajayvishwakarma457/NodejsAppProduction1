"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.storageService = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
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
}
/* ─────────────── S3 Provider (placeholder) ─────────────── */
class S3StorageProvider {
    // Placeholder for future S3/MinIO implementation.
    // Swap in @aws-sdk/client-s3 when ready.
    async upload(file, folder = 'general') {
        logger_1.logger.warn('S3 provider is not yet implemented. Falling back to local.');
        return new LocalStorageProvider().upload(file, folder);
    }
    async delete(_key) {
        throw ApiError_1.ApiError.internal('S3 provider is not yet implemented');
    }
    async exists(_key) {
        throw ApiError_1.ApiError.internal('S3 provider is not yet implemented');
    }
    getStream(_key) {
        throw ApiError_1.ApiError.internal('S3 provider is not yet implemented');
    }
    getUrl(key) {
        return `https://s3.example.com/${key}`;
    }
}
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