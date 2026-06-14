import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { mockClient } from 'aws-sdk-client-mock';
import { Readable } from 'stream';
import { S3StorageProvider } from '../../services/storage.service';

vi.mock('../../config/env', () => ({
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

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(),
}));

describe('S3StorageProvider', () => {
  const s3Mock = mockClient(S3Client);

  beforeEach(() => {
    s3Mock.reset();
    vi.mocked(getSignedUrl).mockReset();
  });

  afterEach(() => {
    s3Mock.restore();
  });

  const createProvider = () => new S3StorageProvider(s3Mock as unknown as S3Client);

  it('should upload a file to S3', async () => {
    s3Mock.on(PutObjectCommand).resolves({});

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

    expect(result.key).toContain('avatars/');
    expect(result.key).toContain('.jpg');
    expect(result.url).toBe(`https://test-bucket.s3.us-east-1.amazonaws.com/${result.key}`);
    expect(result.size).toBe(1024);
    expect(result.mimetype).toBe('image/jpeg');
    expect(result.originalName).toBe('photo.jpg');

    const calls = s3Mock.commandCalls(PutObjectCommand);
    expect(calls).toHaveLength(1);
    expect(calls[0].args[0].input.Bucket).toBe('test-bucket');
    expect(calls[0].args[0].input.Key).toBe(result.key);
    expect(calls[0].args[0].input.ContentType).toBe('image/jpeg');
  });

  it('should delete a file from S3', async () => {
    s3Mock.on(DeleteObjectCommand).resolves({});

    const provider = createProvider();
    const deleted = await provider.delete('avatars/photo.jpg');

    expect(deleted).toBe(true);
    const calls = s3Mock.commandCalls(DeleteObjectCommand);
    expect(calls[0].args[0].input.Bucket).toBe('test-bucket');
    expect(calls[0].args[0].input.Key).toBe('avatars/photo.jpg');
  });

  it('should return true when file exists in S3', async () => {
    s3Mock.on(HeadObjectCommand).resolves({});

    const provider = createProvider();
    const exists = await provider.exists('avatars/photo.jpg');

    expect(exists).toBe(true);
  });

  it('should return false when file does not exist in S3', async () => {
    const notFoundError = new S3ServiceException({
      name: 'NotFound',
      message: 'Not Found',
      $fault: 'client',
      $metadata: {},
    });
    s3Mock.on(HeadObjectCommand).rejects(notFoundError);

    const provider = createProvider();
    const exists = await provider.exists('avatars/missing.jpg');

    expect(exists).toBe(false);
  });

  it('should throw ApiError when S3 upload fails', async () => {
    const s3Error = new S3ServiceException({
      name: 'AccessDenied',
      message: 'Access Denied',
      $fault: 'client',
      $metadata: {},
    });
    s3Mock.on(PutObjectCommand).rejects(s3Error);

    const provider = createProvider();
    const file = {
      fieldname: 'file',
      originalname: 'photo.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 1024,
      buffer: Buffer.from('fake-image'),
    };

    await expect(provider.upload(file)).rejects.toThrow('S3 upload failed');
  });

  it('should get file metadata from S3', async () => {
    s3Mock.on(HeadObjectCommand).resolves({
      ContentLength: 2048,
      ContentType: 'image/png',
      LastModified: new Date('2026-01-01'),
    });

    const provider = createProvider();
    const metadata = await provider.getMetadata('avatars/photo.png');

    expect(metadata).toEqual({
      size: 2048,
      mimetype: 'image/png',
      lastModified: new Date('2026-01-01'),
    });
  });

  it('should return null metadata when file does not exist in S3', async () => {
    const notFoundError = new S3ServiceException({
      name: 'NotFound',
      message: 'Not Found',
      $fault: 'client',
      $metadata: {},
    });
    s3Mock.on(HeadObjectCommand).rejects(notFoundError);

    const provider = createProvider();
    const metadata = await provider.getMetadata('avatars/missing.png');

    expect(metadata).toBeNull();
  });

  it('should generate public S3 URL', () => {
    const provider = createProvider();
    const url = provider.getUrl('avatars/photo.jpg');

    expect(url).toBe('https://test-bucket.s3.us-east-1.amazonaws.com/avatars/photo.jpg');
  });

  it('should use S3_PUBLIC_URL when configured', async () => {
    const { env } = await import('../../config/env');
    env.S3_PUBLIC_URL = 'https://cdn.example.com';

    const provider = createProvider();
    const url = provider.getUrl('avatars/photo.jpg');

    expect(url).toBe('https://cdn.example.com/avatars/photo.jpg');

    env.S3_PUBLIC_URL = undefined;
  });

  it('should generate a signed URL', async () => {
    vi.mocked(getSignedUrl).mockResolvedValue('https://signed-url.example.com');

    const provider = createProvider();
    const url = await provider.getSignedUrl('avatars/photo.jpg', 3600);

    expect(url).toBe('https://signed-url.example.com');
    expect(getSignedUrl).toHaveBeenCalledWith(expect.any(Object), expect.any(GetObjectCommand), {
      expiresIn: 3600,
    });
  });

  it('should stream a file from S3', async () => {
    const stream = Readable.from(['hello world']);
    s3Mock.on(GetObjectCommand).resolves({ Body: stream as unknown as never });

    const provider = createProvider();
    const resultStream = provider.getStream('avatars/photo.jpg');

    const chunks: Buffer[] = [];
    for await (const chunk of resultStream) {
      chunks.push(Buffer.from(chunk));
    }

    expect(Buffer.concat(chunks).toString()).toBe('hello world');
  });

  it('should stream a byte range from S3', async () => {
    const stream = Readable.from(['world']);
    s3Mock.on(GetObjectCommand).resolves({ Body: stream as unknown as never });

    const provider = createProvider();
    const resultStream = provider.getStream('avatars/photo.jpg', 6, 10);

    const chunks: Buffer[] = [];
    for await (const chunk of resultStream) {
      chunks.push(Buffer.from(chunk));
    }

    expect(Buffer.concat(chunks).toString()).toBe('world');

    const calls = s3Mock.commandCalls(GetObjectCommand);
    expect(calls[0].args[0].input.Range).toBe('bytes=6-10');
  });

  it('should initiate a multipart upload', async () => {
    s3Mock.on(CreateMultipartUploadCommand).resolves({ UploadId: 'upload-123' });

    const provider = createProvider();
    const result = await provider.createMultipartUpload('videos/movie.mp4', {
      contentType: 'video/mp4',
    });

    expect(result.uploadId).toBe('upload-123');
    expect(result.key).toBe('videos/movie.mp4');

    const calls = s3Mock.commandCalls(CreateMultipartUploadCommand);
    expect(calls[0].args[0].input.Bucket).toBe('test-bucket');
    expect(calls[0].args[0].input.Key).toBe('videos/movie.mp4');
  });

  it('should generate a multipart upload presigned URL', async () => {
    vi.mocked(getSignedUrl).mockResolvedValue('https://part-upload.example.com');

    const provider = createProvider();
    const url = await provider.getMultipartUploadUrl('upload-123', 'videos/movie.mp4', 1);

    expect(url).toBe('https://part-upload.example.com');
    expect(getSignedUrl).toHaveBeenCalledWith(expect.any(Object), expect.any(UploadPartCommand), {
      expiresIn: 3600,
    });
  });

  it('should complete a multipart upload', async () => {
    s3Mock.on(CompleteMultipartUploadCommand).resolves({});

    const provider = createProvider();
    const result = await provider.completeMultipartUpload('upload-123', 'videos/movie.mp4', [
      { ETag: '"etag-1"', PartNumber: 1 },
      { ETag: '"etag-2"', PartNumber: 2 },
    ]);

    expect(result.key).toBe('videos/movie.mp4');
    expect(result.url).toBe('https://test-bucket.s3.us-east-1.amazonaws.com/videos/movie.mp4');

    const calls = s3Mock.commandCalls(CompleteMultipartUploadCommand);
    expect(calls[0].args[0].input.UploadId).toBe('upload-123');
    expect(calls[0].args[0].input.MultipartUpload?.Parts).toHaveLength(2);
  });

  it('should abort a multipart upload', async () => {
    s3Mock.on(AbortMultipartUploadCommand).resolves({});

    const provider = createProvider();
    await expect(
      provider.abortMultipartUpload('upload-123', 'videos/movie.mp4')
    ).resolves.toBeUndefined();

    const calls = s3Mock.commandCalls(AbortMultipartUploadCommand);
    expect(calls[0].args[0].input.UploadId).toBe('upload-123');
  });
});
