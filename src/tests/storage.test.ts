import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { storageService } from '../services/storage.service';
import { ApiError } from '../utils/ApiError';

describe('storageService', () => {
  const testBuffer = Buffer.from('hello world');

  beforeAll(async () => {
    await fs.mkdir('uploads', { recursive: true });
  });

  afterAll(async () => {
    try {
      await fs.rm('uploads', { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('should upload a file and return result', async () => {
    const result = await storageService.upload(
      {
        fieldname: 'file',
        originalname: 'test.txt',
        encoding: 'utf-8',
        mimetype: 'text/plain',
        size: testBuffer.length,
        buffer: testBuffer,
      },
      'test-folder'
    );

    expect(result.key).toContain('test-folder/');
    expect(result.url).toContain('/uploads/');
    expect(result.size).toBe(testBuffer.length);
    expect(result.originalName).toBe('test.txt');
  });

  it('should check file existence', async () => {
    const result = await storageService.upload(
      {
        fieldname: 'file',
        originalname: 'exists.txt',
        encoding: 'utf-8',
        mimetype: 'text/plain',
        size: testBuffer.length,
        buffer: testBuffer,
      },
      'test-folder'
    );

    expect(await storageService.exists(result.key)).toBe(true);
  });

  it('should delete a file', async () => {
    const result = await storageService.upload(
      {
        fieldname: 'file',
        originalname: 'delete-me.txt',
        encoding: 'utf-8',
        mimetype: 'text/plain',
        size: testBuffer.length,
        buffer: testBuffer,
      },
      'test-folder'
    );

    const deleted = await storageService.delete(result.key);
    expect(deleted).toBe(true);
    expect(await storageService.exists(result.key)).toBe(false);
  });

  it('should return false when deleting non-existent file', async () => {
    const deleted = await storageService.delete('test-folder/non-existent.txt');
    expect(deleted).toBe(false);
  });

  it('should generate a unique key', () => {
    const key1 = storageService.generateKey('photo.jpg', 'avatars');
    const key2 = storageService.generateKey('photo.jpg', 'avatars');

    expect(key1).toContain('avatars/');
    expect(key1).not.toBe(key2);
  });

  it('should validate allowed file types', () => {
    expect(() =>
      storageService.validate({
        fieldname: 'file',
        originalname: 'photo.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1024,
      })
    ).not.toThrow();
  });

  it('should reject disallowed file types', () => {
    expect(() =>
      storageService.validate({
        fieldname: 'file',
        originalname: 'script.exe',
        encoding: '7bit',
        mimetype: 'application/x-msdownload',
        size: 1024,
      })
    ).toThrow(ApiError);
  });

  it('should reject oversized files', () => {
    expect(() =>
      storageService.validate({
        fieldname: 'file',
        originalname: 'huge.png',
        encoding: '7bit',
        mimetype: 'image/png',
        size: 20 * 1024 * 1024, // 20MB > 10MB default
      })
    ).toThrow(ApiError);
  });

  it('should get a readable stream', async () => {
    const result = await storageService.upload(
      {
        fieldname: 'file',
        originalname: 'stream.txt',
        encoding: 'utf-8',
        mimetype: 'text/plain',
        size: testBuffer.length,
        buffer: testBuffer,
      },
      'test-folder'
    );

    const stream = storageService.getStream(result.key);
    const chunks: Buffer[] = [];

    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }

    expect(Buffer.concat(chunks).toString()).toBe('hello world');
  });
});
