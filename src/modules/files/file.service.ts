import { storageService } from '../../services/storage.service';
import { ApiError } from '../../utils/ApiError';

export interface StreamRange {
  start: number;
  end: number;
  total: number;
}

export interface MultipartInitInput {
  fileName: string;
  folder?: string;
  contentType?: string;
}

export interface MultipartCompleteInput {
  uploadId: string;
  key: string;
  parts: Array<{ ETag: string; PartNumber: number }>;
}

export interface MultipartAbortInput {
  uploadId: string;
  key: string;
}

export const fileService = {
  /**
   * Parse an HTTP Range header into start/end byte positions.
   * Supports `bytes=start-end`, `bytes=start-`, and `bytes=-suffix`.
   * Returns null if the range is unsatisfiable or not provided.
   */
  parseRange(rangeHeader: string | undefined, totalSize: number): StreamRange | null {
    if (!rangeHeader || !rangeHeader.startsWith('bytes=')) {
      return null;
    }

    const rangeValue = rangeHeader.replace('bytes=', '');
    const [startStr, endStr] = rangeValue.split('-');

    // Suffix range: bytes=-500 means last 500 bytes
    if (startStr === '' && endStr) {
      const suffix = parseInt(endStr, 10);
      if (Number.isNaN(suffix) || suffix <= 0) return null;
      const start = Math.max(0, totalSize - suffix);
      return { start, end: totalSize - 1, total: totalSize };
    }

    const start = parseInt(startStr, 10);
    if (Number.isNaN(start) || start < 0 || start >= totalSize) {
      return null;
    }

    const end = endStr ? Math.min(parseInt(endStr, 10), totalSize - 1) : totalSize - 1;
    if (Number.isNaN(end) || end < start) {
      return null;
    }

    return { start, end, total: totalSize };
  },

  /**
   * Stream a file, optionally within a byte range.
   */
  async streamFile(key: string, rangeHeader?: string) {
    const metadata = await storageService.getMetadata(key);
    if (!metadata) {
      throw ApiError.notFound('File not found');
    }

    const range = this.parseRange(rangeHeader, metadata.size);

    if (rangeHeader && !range) {
      throw ApiError.rangeNotSatisfiable('Invalid range header');
    }

    const stream = range
      ? storageService.getStream(key, range.start, range.end)
      : storageService.getStream(key);

    return {
      stream,
      metadata,
      range,
    };
  },

  /**
   * Initiate a multipart upload and return the upload ID and key.
   */
  async initMultipartUpload(input: MultipartInitInput) {
    const ext = input.fileName.includes('.')
      ? input.fileName.slice(input.fileName.lastIndexOf('.'))
      : '.bin';

    const key = storageService.generateKey(`multipart${ext}`, input.folder ?? 'general');

    const result = await storageService.createMultipartUpload(key, {
      originalName: input.fileName,
      contentType: input.contentType ?? 'application/octet-stream',
    });

    return {
      uploadId: result.uploadId,
      key: result.key,
      url: storageService.getUrl(result.key),
    };
  },

  /**
   * Generate a presigned URL for a specific multipart part.
   */
  async getMultipartUploadUrl(uploadId: string, key: string, partNumber: number) {
    if (partNumber < 1 || partNumber > 10000) {
      throw ApiError.badRequest('Part number must be between 1 and 10000');
    }

    const url = await storageService.getMultipartUploadUrl(uploadId, key, partNumber);
    return { url, partNumber };
  },

  /**
   * Complete a multipart upload by assembling all parts.
   */
  async completeMultipartUpload(input: MultipartCompleteInput) {
    if (!input.parts || input.parts.length === 0) {
      throw ApiError.badRequest('At least one part is required');
    }

    const result = await storageService.completeMultipartUpload(
      input.uploadId,
      input.key,
      input.parts
    );

    return {
      key: result.key,
      url: result.url,
    };
  },

  /**
   * Abort a multipart upload and discard uploaded parts.
   */
  async abortMultipartUpload(input: MultipartAbortInput) {
    await storageService.abortMultipartUpload(input.uploadId, input.key);
  },
};
