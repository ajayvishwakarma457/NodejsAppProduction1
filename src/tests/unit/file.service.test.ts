import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fileService } from '../../modules/files/file.service';
import { storageService } from '../../services/storage.service';
import { ApiError } from '../../utils/ApiError';

vi.mock('../../services/storage.service', () => ({
  storageService: {
    getMetadata: vi.fn(),
    getStream: vi.fn(),
    generateKey: vi.fn(),
    createMultipartUpload: vi.fn(),
    getMultipartUploadUrl: vi.fn(),
    completeMultipartUpload: vi.fn(),
    abortMultipartUpload: vi.fn(),
    getUrl: vi.fn(),
  },
}));

describe('fileService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseRange', () => {
    it('returns null when no range header is provided', () => {
      expect(fileService.parseRange(undefined, 1000)).toBeNull();
    });

    it('parses a full byte range', () => {
      const range = fileService.parseRange('bytes=0-499', 1000);
      expect(range).toEqual({ start: 0, end: 499, total: 1000 });
    });

    it('parses an open-ended range', () => {
      const range = fileService.parseRange('bytes=500-', 1000);
      expect(range).toEqual({ start: 500, end: 999, total: 1000 });
    });

    it('parses a suffix range', () => {
      const range = fileService.parseRange('bytes=-100', 1000);
      expect(range).toEqual({ start: 900, end: 999, total: 1000 });
    });

    it('caps end at total size - 1', () => {
      const range = fileService.parseRange('bytes=0-2000', 1000);
      expect(range).toEqual({ start: 0, end: 999, total: 1000 });
    });

    it('returns null for invalid range', () => {
      expect(fileService.parseRange('bytes=1000-2000', 1000)).toBeNull();
      expect(fileService.parseRange('bytes=500-400', 1000)).toBeNull();
      expect(fileService.parseRange('bytes=abc-def', 1000)).toBeNull();
    });
  });

  describe('streamFile', () => {
    it('streams a full file when no range header is provided', async () => {
      const fakeStream = { pipe: vi.fn() } as unknown as NodeJS.ReadableStream;
      vi.mocked(storageService.getMetadata).mockResolvedValue({
        size: 1024,
        mimetype: 'video/mp4',
      });
      vi.mocked(storageService.getStream).mockReturnValue(fakeStream);

      const result = await fileService.streamFile('videos/movie.mp4');

      expect(result.metadata).toEqual({ size: 1024, mimetype: 'video/mp4' });
      expect(result.range).toBeNull();
      expect(storageService.getStream).toHaveBeenCalledWith('videos/movie.mp4');
    });

    it('streams a byte range when range header is valid', async () => {
      const fakeStream = { pipe: vi.fn() } as unknown as NodeJS.ReadableStream;
      vi.mocked(storageService.getMetadata).mockResolvedValue({
        size: 1024,
        mimetype: 'video/mp4',
      });
      vi.mocked(storageService.getStream).mockReturnValue(fakeStream);

      const result = await fileService.streamFile('videos/movie.mp4', 'bytes=0-99');

      expect(result.range).toEqual({ start: 0, end: 99, total: 1024 });
      expect(storageService.getStream).toHaveBeenCalledWith('videos/movie.mp4', 0, 99);
    });

    it('throws not found when metadata is null', async () => {
      vi.mocked(storageService.getMetadata).mockResolvedValue(null);

      await expect(fileService.streamFile('videos/missing.mp4')).rejects.toThrow(ApiError);
    });

    it('throws range not satisfiable for invalid range', async () => {
      vi.mocked(storageService.getMetadata).mockResolvedValue({
        size: 100,
        mimetype: 'video/mp4',
      });

      await expect(fileService.streamFile('videos/movie.mp4', 'bytes=100-200')).rejects.toThrow(
        'Invalid range header'
      );
    });
  });

  describe('multipart uploads', () => {
    it('initiates a multipart upload', async () => {
      vi.mocked(storageService.generateKey).mockReturnValue('videos/uuid-movie.mp4');
      vi.mocked(storageService.createMultipartUpload).mockResolvedValue({
        uploadId: 'upload-123',
        key: 'videos/uuid-movie.mp4',
      });
      vi.mocked(storageService.getUrl).mockReturnValue(
        'https://test-bucket.s3.amazonaws.com/videos/uuid-movie.mp4'
      );

      const result = await fileService.initMultipartUpload({
        fileName: 'movie.mp4',
        folder: 'videos',
        contentType: 'video/mp4',
      });

      expect(result.uploadId).toBe('upload-123');
      expect(result.key).toBe('videos/uuid-movie.mp4');
      expect(storageService.createMultipartUpload).toHaveBeenCalledWith(
        'videos/uuid-movie.mp4',
        expect.objectContaining({ contentType: 'video/mp4' })
      );
    });

    it('validates part number range', async () => {
      await expect(
        fileService.getMultipartUploadUrl('upload-123', 'videos/movie.mp4', 0)
      ).rejects.toThrow('Part number must be between 1 and 10000');

      await expect(
        fileService.getMultipartUploadUrl('upload-123', 'videos/movie.mp4', 10001)
      ).rejects.toThrow('Part number must be between 1 and 10000');
    });

    it('requires at least one part to complete upload', async () => {
      await expect(
        fileService.completeMultipartUpload({
          uploadId: 'upload-123',
          key: 'videos/movie.mp4',
          parts: [],
        })
      ).rejects.toThrow('At least one part is required');
    });
  });
});
