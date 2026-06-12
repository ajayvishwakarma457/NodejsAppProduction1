import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { fileService } from './file.service';
import { ApiResponse } from '../../utils/ApiResponse';

const TWO_WEEKS_SECONDS = 14 * 24 * 60 * 60;

export const fileController = {
  /**
   * Stream a file with optional HTTP Range support.
   * Works for both local and S3 storage providers.
   */
  async stream(req: Request, res: Response) {
    const key = decodeURIComponent(req.params.key as string);
    const rangeHeader = req.headers.range;

    const { stream, metadata, range } = await fileService.streamFile(key, rangeHeader);

    const headers: Record<string, string> = {
      'Content-Type': metadata.mimetype,
      'Accept-Ranges': 'bytes',
      'Cache-Control': `public, max-age=${TWO_WEEKS_SECONDS}`,
    };

    if (range) {
      res.status(StatusCodes.PARTIAL_CONTENT);
      headers['Content-Range'] = `bytes ${range.start}-${range.end}/${range.total}`;
      headers['Content-Length'] = String(range.end - range.start + 1);
    } else {
      headers['Content-Length'] = String(metadata.size);
    }

    Object.entries(headers).forEach(([name, value]) => res.setHeader(name, value));

    // Handle stream errors gracefully
    stream.on('error', (err: Error) => {
      // If headers are already sent, we can only destroy the connection
      if (res.headersSent) {
        res.destroy();
        return;
      }
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: err.message || 'Stream error',
      });
    });

    stream.pipe(res);
  },

  /**
   * Initiate a multipart upload.
   */
  async initMultipartUpload(req: Request, res: Response) {
    const result = await fileService.initMultipartUpload(req.body);
    ApiResponse.created(result, 'Multipart upload initiated').send(res);
  },

  /**
   * Generate a presigned URL for a multipart part.
   */
  async getMultipartUploadUrl(req: Request, res: Response) {
    const { uploadId, key, partNumber } = req.body;
    const result = await fileService.getMultipartUploadUrl(uploadId, key, partNumber);
    ApiResponse.ok(result).send(res);
  },

  /**
   * Complete a multipart upload.
   */
  async completeMultipartUpload(req: Request, res: Response) {
    const result = await fileService.completeMultipartUpload(req.body);
    ApiResponse.ok(result, 'Multipart upload completed').send(res);
  },

  /**
   * Abort a multipart upload.
   */
  async abortMultipartUpload(req: Request, res: Response) {
    await fileService.abortMultipartUpload(req.body);
    ApiResponse.noContent('Multipart upload aborted').send(res);
  },
};
