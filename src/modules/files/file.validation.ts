import { z } from 'zod';

export const streamFileSchema = z.object({
  params: z.object({
    key: z.string().min(1, 'File key is required'),
  }),
});

export const initMultipartUploadSchema = z.object({
  body: z.object({
    fileName: z.string().min(1, 'File name is required').max(255),
    folder: z.string().max(100).optional(),
    contentType: z.string().max(100).optional(),
  }),
});

export const multipartUploadUrlSchema = z.object({
  body: z.object({
    uploadId: z.string().min(1, 'Upload ID is required'),
    key: z.string().min(1, 'File key is required'),
    partNumber: z.coerce.number().min(1).max(10000),
  }),
});

export const completeMultipartUploadSchema = z.object({
  body: z.object({
    uploadId: z.string().min(1, 'Upload ID is required'),
    key: z.string().min(1, 'File key is required'),
    parts: z
      .array(
        z.object({
          ETag: z.string().min(1, 'ETag is required'),
          PartNumber: z.coerce.number().min(1).max(10000),
        })
      )
      .min(1, 'At least one part is required'),
  }),
});

export const abortMultipartUploadSchema = z.object({
  body: z.object({
    uploadId: z.string().min(1, 'Upload ID is required'),
    key: z.string().min(1, 'File key is required'),
  }),
});
