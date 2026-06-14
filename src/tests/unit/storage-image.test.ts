import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import sharp from 'sharp';
import { storageService } from '../../services/storage.service';

vi.mock('../../config/env', () => ({
  env: {
    STORAGE_PROVIDER: 'local',
    STORAGE_LOCAL_PATH: 'uploads',
    STORAGE_MAX_FILE_SIZE_MB: 10,
    STORAGE_ALLOWED_MIME_TYPES: 'image/jpeg,image/png,image/webp,application/pdf',
    IMAGE_PROCESSING_ENABLED: true,
    IMAGE_MAX_WIDTH: 400,
    IMAGE_MAX_HEIGHT: 300,
    IMAGE_QUALITY: 80,
    IMAGE_OUTPUT_FORMAT: 'webp',
    IMAGE_VARIANTS: 'thumbnail:100x100:cover',
  },
}));

describe('storageService image upload', () => {
  beforeEach(async () => {
    await fs.mkdir('uploads', { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm('uploads', { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('processes images and uploads variants when enabled', async () => {
    const buffer = await sharp({
      create: { width: 800, height: 600, channels: 3, background: 'blue' },
    })
      .png()
      .toBuffer();

    const result = await storageService.upload(
      {
        fieldname: 'file',
        originalname: 'photo.png',
        encoding: '7bit',
        mimetype: 'image/png',
        size: buffer.length,
        buffer,
      },
      'test-images'
    );

    expect(result.mimetype).toBe('image/webp');
    expect(result.variants).toBeDefined();
    expect(result.variants).toHaveLength(2);

    const master = result.variants!.find((v) => v.name === 'master');
    const thumbnail = result.variants!.find((v) => v.name === 'thumbnail');

    expect(master).toBeDefined();
    expect(master!.width).toBeLessThanOrEqual(400);
    expect(master!.height).toBeLessThanOrEqual(300);

    expect(thumbnail).toBeDefined();
    expect(thumbnail!.width).toBeLessThanOrEqual(100);
    expect(thumbnail!.height).toBeLessThanOrEqual(100);

    // All variants should exist on disk
    for (const variant of result.variants!) {
      expect(await storageService.exists(variant.key)).toBe(true);
    }
  });

  it('skips image processing for non-image files', async () => {
    const result = await storageService.upload(
      {
        fieldname: 'file',
        originalname: 'document.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        size: 12,
        buffer: Buffer.from('hello world'),
      },
      'test-files'
    );

    expect(result.mimetype).toBe('application/pdf');
    expect(result.variants).toBeUndefined();
  });
});
