import fs from 'fs/promises';
import path from 'path';
import { createReadStream } from 'fs';
import type { Request } from 'express';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { ApiError } from '../utils/ApiError';

export interface StorageFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination?: string;
  filename?: string;
  path?: string;
  buffer?: Buffer;
}

export interface UploadResult {
  key: string;
  url: string;
  size: number;
  mimetype: string;
  originalName: string;
}

export interface StorageProvider {
  upload(file: StorageFile, folder?: string): Promise<UploadResult>;
  delete(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  getStream(key: string): NodeJS.ReadableStream;
  getUrl(key: string): string;
}

/* ─────────────── Local Provider ─────────────── */

class LocalStorageProvider implements StorageProvider {
  private basePath: string;
  private publicUrl: string;

  constructor() {
    this.basePath = path.resolve(env.STORAGE_LOCAL_PATH);
    this.publicUrl = '/uploads';
  }

  private resolvePath(key: string): string {
    // Prevent directory traversal
    const clean = key.replace(/\.\./g, '').replace(/^\/+/g, '');
    return path.join(this.basePath, clean);
  }

  async upload(file: StorageFile, folder = 'general'): Promise<UploadResult> {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname) || '.bin';
    const safeName = `${timestamp}-${Math.random().toString(36).slice(2, 10)}${ext}`;
    const key = path.join(folder, safeName).replace(/\\/g, '/');
    const destPath = this.resolvePath(key);

    await fs.mkdir(path.dirname(destPath), { recursive: true });

    if (file.buffer) {
      await fs.writeFile(destPath, file.buffer);
    } else if (file.path) {
      await fs.copyFile(file.path, destPath);
    } else {
      throw ApiError.internal('No file buffer or path available');
    }

    logger.info('File uploaded (local)', { key, size: file.size });

    return {
      key,
      url: this.getUrl(key),
      size: file.size,
      mimetype: file.mimetype,
      originalName: file.originalname,
    };
  }

  async delete(key: string): Promise<boolean> {
    try {
      const filePath = this.resolvePath(key);
      await fs.unlink(filePath);
      logger.info('File deleted (local)', { key });
      return true;
    } catch {
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(this.resolvePath(key));
      return true;
    } catch {
      return false;
    }
  }

  getStream(key: string): NodeJS.ReadableStream {
    return createReadStream(this.resolvePath(key));
  }

  getUrl(key: string): string {
    return `${this.publicUrl}/${key.replace(/\\/g, '/')}`;
  }
}

/* ─────────────── S3 Provider (placeholder) ─────────────── */

class S3StorageProvider implements StorageProvider {
  // Placeholder for future S3/MinIO implementation.
  // Swap in @aws-sdk/client-s3 when ready.

  async upload(file: StorageFile, folder = 'general'): Promise<UploadResult> {
    logger.warn('S3 provider is not yet implemented. Falling back to local.');
    return new LocalStorageProvider().upload(file, folder);
  }

  async delete(_key: string): Promise<boolean> {
    throw ApiError.internal('S3 provider is not yet implemented');
  }

  async exists(_key: string): Promise<boolean> {
    throw ApiError.internal('S3 provider is not yet implemented');
  }

  getStream(_key: string): NodeJS.ReadableStream {
    throw ApiError.internal('S3 provider is not yet implemented');
  }

  getUrl(key: string): string {
    return `https://s3.example.com/${key}`;
  }
}

/* ─────────────── Factory ─────────────── */

const createProvider = (): StorageProvider => {
  switch (env.STORAGE_PROVIDER) {
    case 's3':
      return new S3StorageProvider();
    case 'local':
    default:
      return new LocalStorageProvider();
  }
};

let providerInstance: StorageProvider | null = null;

const getProvider = (): StorageProvider => {
  if (!providerInstance) {
    providerInstance = createProvider();
  }
  return providerInstance;
};

/* ─────────────── Service API ─────────────── */

export const storageService = {
  /** Upload a file to the configured provider. */
  async upload(file: StorageFile, folder?: string): Promise<UploadResult> {
    return getProvider().upload(file, folder);
  },

  /** Delete a file by its storage key. */
  async delete(key: string): Promise<boolean> {
    return getProvider().delete(key);
  },

  /** Check if a file exists. */
  async exists(key: string): Promise<boolean> {
    return getProvider().exists(key);
  },

  /** Get a readable stream for a file. */
  getStream(key: string): NodeJS.ReadableStream {
    return getProvider().getStream(key);
  },

  /** Get the public URL for a file key. */
  getUrl(key: string): string {
    return getProvider().getUrl(key);
  },

  /** Validate file size and MIME type (used by multer or controllers). */
  validate(file: StorageFile): void {
    const maxBytes = env.STORAGE_MAX_FILE_SIZE_MB * 1024 * 1024;

    if (file.size > maxBytes) {
      throw ApiError.badRequest(`File size exceeds ${env.STORAGE_MAX_FILE_SIZE_MB}MB limit`);
    }

    const allowed = env.STORAGE_ALLOWED_MIME_TYPES.split(',').map((t) => t.trim().toLowerCase());

    if (!allowed.includes(file.mimetype.toLowerCase())) {
      throw ApiError.badRequest(
        `File type "${file.mimetype}" is not allowed. Allowed: ${allowed.join(', ')}`
      );
    }
  },

  /** Generate a unique safe filename. */
  generateKey(originalName: string, folder = 'general'): string {
    const ext = path.extname(originalName) || '.bin';
    const timestamp = Date.now();
    const rand = Math.random().toString(36).slice(2, 10);
    return path.join(folder, `${timestamp}-${rand}${ext}`).replace(/\\/g, '/');
  },

  /** Multer file filter compatible with Express. */
  multerFileFilter(
    _req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, acceptFile?: boolean) => void
  ): void {
    const allowed = env.STORAGE_ALLOWED_MIME_TYPES.split(',').map((t) => t.trim().toLowerCase());

    if (allowed.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error(`File type "${file.mimetype}" is not allowed. Allowed: ${allowed.join(', ')}`));
    }
  },
};
