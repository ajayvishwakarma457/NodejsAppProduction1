import fs from 'fs/promises';
import path from 'path';
import { createReadStream, stat } from 'fs';
import { PassThrough } from 'stream';
import { promisify } from 'util';
import type { Request } from 'express';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { getSignedUrl as awsGetSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { ApiError } from '../utils/ApiError';

const statAsync = promisify(stat);

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

export interface FileMetadata {
  size: number;
  mimetype: string;
  lastModified?: Date;
}

export interface MultipartUploadPart {
  ETag: string;
  PartNumber: number;
}

export interface MultipartUploadInitResult {
  uploadId: string;
  key: string;
}

export interface StorageProvider {
  upload(file: StorageFile, folder?: string): Promise<UploadResult>;
  delete(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  getMetadata(key: string): Promise<FileMetadata | null>;
  getStream(key: string, start?: number, end?: number): NodeJS.ReadableStream;
  getUrl(key: string): string;
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
  createMultipartUpload(
    key: string,
    metadata?: Record<string, string>
  ): Promise<MultipartUploadInitResult>;
  getMultipartUploadUrl(
    uploadId: string,
    key: string,
    partNumber: number,
    expiresInSeconds?: number
  ): Promise<string>;
  completeMultipartUpload(
    uploadId: string,
    key: string,
    parts: MultipartUploadPart[]
  ): Promise<{ key: string; url: string }>;
  abortMultipartUpload(uploadId: string, key: string): Promise<void>;
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

  async getMetadata(key: string): Promise<FileMetadata | null> {
    try {
      const stats = await statAsync(this.resolvePath(key));
      return {
        size: stats.size,
        mimetype: 'application/octet-stream',
        lastModified: stats.mtime,
      };
    } catch {
      return null;
    }
  }

  getStream(key: string, start?: number, end?: number): NodeJS.ReadableStream {
    const options: { start?: number; end?: number } = {};
    if (start !== undefined) options.start = start;
    if (end !== undefined) options.end = end;
    return createReadStream(this.resolvePath(key), options);
  }

  getUrl(key: string): string {
    return `${this.publicUrl}/${key.replace(/\\/g, '/')}`;
  }

  async getSignedUrl(key: string, _expiresInSeconds = 3600): Promise<string> {
    // Local files are served publicly; signed URLs are not needed.
    return this.getUrl(key);
  }

  async createMultipartUpload(): Promise<MultipartUploadInitResult> {
    throw ApiError.internal('Multipart uploads are not supported for local storage provider');
  }

  async getMultipartUploadUrl(): Promise<string> {
    throw ApiError.internal('Multipart uploads are not supported for local storage provider');
  }

  async completeMultipartUpload(): Promise<{ key: string; url: string }> {
    throw ApiError.internal('Multipart uploads are not supported for local storage provider');
  }

  async abortMultipartUpload(): Promise<void> {
    throw ApiError.internal('Multipart uploads are not supported for local storage provider');
  }
}

/* ─────────────── S3 Provider ─────────────── */

export class S3StorageProvider implements StorageProvider {
  private client: S3Client;
  private bucket: string;

  constructor(client?: S3Client) {
    this.validateConfig();

    this.bucket = env.S3_BUCKET_NAME;
    this.client =
      client ??
      new S3Client({
        region: env.AWS_REGION,
        credentials: {
          accessKeyId: env.AWS_ACCESS_KEY_ID,
          secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
        },
        endpoint: env.S3_ENDPOINT,
        forcePathStyle: env.S3_FORCE_PATH_STYLE,
      });
  }

  private validateConfig(): void {
    const required = {
      AWS_ACCESS_KEY_ID: env.AWS_ACCESS_KEY_ID,
      AWS_SECRET_ACCESS_KEY: env.AWS_SECRET_ACCESS_KEY,
      S3_BUCKET_NAME: env.S3_BUCKET_NAME,
    };

    const missing = Object.entries(required)
      .filter(([, value]) => !value)
      .map(([key]) => key);

    if (missing.length > 0) {
      throw new Error(
        `S3 storage provider is missing required environment variables: ${missing.join(', ')}`
      );
    }
  }

  private mapS3Error(err: unknown, operation: string, key?: string): never {
    if (err instanceof S3ServiceException) {
      logger.error(`S3 ${operation} failed`, {
        key,
        code: err.name,
        message: err.message,
      });
      throw ApiError.internal(`S3 ${operation} failed: ${err.name}`);
    }

    logger.error(`S3 ${operation} failed`, {
      key,
      error: err instanceof Error ? err.message : err,
    });
    throw ApiError.internal(`S3 ${operation} failed`);
  }

  async upload(file: StorageFile, folder = 'general'): Promise<UploadResult> {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname) || '.bin';
    const safeName = `${timestamp}-${Math.random().toString(36).slice(2, 10)}${ext}`;
    const key = path.join(folder, safeName).replace(/\\/g, '/');

    const body = file.buffer ?? (file.path ? await fs.readFile(file.path) : undefined);
    if (!body) {
      throw ApiError.internal('No file buffer or path available');
    }

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: file.mimetype,
          ContentLength: file.size,
        })
      );

      logger.info('File uploaded (S3)', { bucket: this.bucket, key, size: file.size });

      return {
        key,
        url: this.getUrl(key),
        size: file.size,
        mimetype: file.mimetype,
        originalName: file.originalname,
      };
    } catch (err) {
      this.mapS3Error(err, 'upload', key);
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );
      logger.info('File deleted (S3)', { bucket: this.bucket, key });
      return true;
    } catch (err) {
      this.mapS3Error(err, 'delete', key);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );
      return true;
    } catch (err) {
      if (err instanceof S3ServiceException && err.name === 'NotFound') {
        return false;
      }
      this.mapS3Error(err, 'exists', key);
    }
  }

  async getMetadata(key: string): Promise<FileMetadata | null> {
    try {
      const result = await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );
      return {
        size: result.ContentLength ?? 0,
        mimetype: result.ContentType ?? 'application/octet-stream',
        lastModified: result.LastModified,
      };
    } catch (err) {
      if (err instanceof S3ServiceException && err.name === 'NotFound') {
        return null;
      }
      this.mapS3Error(err, 'getMetadata', key);
    }
  }

  getStream(key: string, start?: number, end?: number): NodeJS.ReadableStream {
    const passThrough = new PassThrough();

    const range = start !== undefined && end !== undefined ? `bytes=${start}-${end}` : undefined;

    this.client
      .send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Range: range,
        })
      )
      .then((response) => {
        if (!response.Body) {
          passThrough.destroy(ApiError.notFound('File not found'));
          return;
        }
        (response.Body as NodeJS.ReadableStream).pipe(passThrough);
      })
      .catch((err) => {
        passThrough.destroy(err);
      });

    return passThrough;
  }

  getUrl(key: string): string {
    if (env.S3_PUBLIC_URL) {
      const base = env.S3_PUBLIC_URL.replace(/\/$/, '');
      return `${base}/${key.replace(/^\/+/g, '')}`;
    }

    if (env.S3_ENDPOINT) {
      const base = env.S3_ENDPOINT.replace(/\/$/, '');
      if (env.S3_FORCE_PATH_STYLE) {
        return `${base}/${this.bucket}/${key.replace(/^\/+/g, '')}`;
      }
      return `${base}/${key.replace(/^\/+/g, '')}`;
    }

    // Standard AWS virtual-hosted style URL
    return `https://${this.bucket}.s3.${env.AWS_REGION}.amazonaws.com/${key.replace(/^\/+/g, '')}`;
  }

  async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    try {
      return await awsGetSignedUrl(
        this.client,
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
        { expiresIn: expiresInSeconds }
      );
    } catch (err) {
      this.mapS3Error(err, 'getSignedUrl', key);
    }
  }

  async createMultipartUpload(
    key: string,
    metadata?: Record<string, string>
  ): Promise<MultipartUploadInitResult> {
    try {
      const result = await this.client.send(
        new CreateMultipartUploadCommand({
          Bucket: this.bucket,
          Key: key,
          Metadata: metadata,
        })
      );

      if (!result.UploadId) {
        throw ApiError.internal('S3 did not return an upload ID');
      }

      logger.info('Multipart upload initiated (S3)', { bucket: this.bucket, key });

      return {
        uploadId: result.UploadId,
        key,
      };
    } catch (err) {
      this.mapS3Error(err, 'createMultipartUpload', key);
    }
  }

  async getMultipartUploadUrl(
    uploadId: string,
    key: string,
    partNumber: number,
    expiresInSeconds = 3600
  ): Promise<string> {
    try {
      return await awsGetSignedUrl(
        this.client,
        new UploadPartCommand({
          Bucket: this.bucket,
          Key: key,
          UploadId: uploadId,
          PartNumber: partNumber,
        }),
        { expiresIn: expiresInSeconds }
      );
    } catch (err) {
      this.mapS3Error(err, 'getMultipartUploadUrl', key);
    }
  }

  async completeMultipartUpload(
    uploadId: string,
    key: string,
    parts: MultipartUploadPart[]
  ): Promise<{ key: string; url: string }> {
    try {
      await this.client.send(
        new CompleteMultipartUploadCommand({
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
        })
      );

      logger.info('Multipart upload completed (S3)', { bucket: this.bucket, key });

      return {
        key,
        url: this.getUrl(key),
      };
    } catch (err) {
      this.mapS3Error(err, 'completeMultipartUpload', key);
    }
  }

  async abortMultipartUpload(uploadId: string, key: string): Promise<void> {
    try {
      await this.client.send(
        new AbortMultipartUploadCommand({
          Bucket: this.bucket,
          Key: key,
          UploadId: uploadId,
        })
      );

      logger.info('Multipart upload aborted (S3)', { bucket: this.bucket, key });
    } catch (err) {
      this.mapS3Error(err, 'abortMultipartUpload', key);
    }
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

  /** Get file metadata (size, mimetype, lastModified). */
  async getMetadata(key: string): Promise<FileMetadata | null> {
    return getProvider().getMetadata(key);
  },

  /** Get a readable stream for a file, optionally constrained to a byte range. */
  getStream(key: string, start?: number, end?: number): NodeJS.ReadableStream {
    return getProvider().getStream(key, start, end);
  },

  /** Get the public URL for a file key. */
  getUrl(key: string): string {
    return getProvider().getUrl(key);
  },

  /** Get a temporary signed URL for private access. */
  async getSignedUrl(key: string, expiresInSeconds?: number): Promise<string> {
    return getProvider().getSignedUrl(key, expiresInSeconds);
  },

  /** Initiate a multipart upload. */
  async createMultipartUpload(
    key: string,
    metadata?: Record<string, string>
  ): Promise<MultipartUploadInitResult> {
    return getProvider().createMultipartUpload(key, metadata);
  },

  /** Get a presigned URL to upload a single multipart part. */
  async getMultipartUploadUrl(
    uploadId: string,
    key: string,
    partNumber: number,
    expiresInSeconds?: number
  ): Promise<string> {
    return getProvider().getMultipartUploadUrl(uploadId, key, partNumber, expiresInSeconds);
  },

  /** Complete a multipart upload by combining all uploaded parts. */
  async completeMultipartUpload(
    uploadId: string,
    key: string,
    parts: MultipartUploadPart[]
  ): Promise<{ key: string; url: string }> {
    return getProvider().completeMultipartUpload(uploadId, key, parts);
  },

  /** Abort a multipart upload and clean up uploaded parts. */
  async abortMultipartUpload(uploadId: string, key: string): Promise<void> {
    return getProvider().abortMultipartUpload(uploadId, key);
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
