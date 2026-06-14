import { describe, it, expect, vi, beforeEach } from 'vitest';
import sharp from 'sharp';
import {
  isImage,
  parseVariantConfig,
  processImage,
  getProcessedFileName,
} from '../../utils/image-processor';

vi.mock('../../config/env', () => ({
  env: {
    IMAGE_PROCESSING_ENABLED: true,
    IMAGE_MAX_WIDTH: 800,
    IMAGE_MAX_HEIGHT: 600,
    IMAGE_QUALITY: 80,
    IMAGE_OUTPUT_FORMAT: 'webp',
    IMAGE_VARIANTS: 'thumbnail:150x150:cover,small:400x300:inside',
  },
}));

describe('image-processor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('detects image MIME types', () => {
    expect(isImage('image/jpeg')).toBe(true);
    expect(isImage('image/png')).toBe(true);
    expect(isImage('image/webp')).toBe(true);
    expect(isImage('application/pdf')).toBe(false);
    expect(isImage('text/plain')).toBe(false);
  });

  it('parses variant config', () => {
    const variants = parseVariantConfig('thumbnail:150x150:cover,medium:800x600:inside');
    expect(variants).toEqual([
      { name: 'thumbnail', width: 150, height: 150, fit: 'cover' },
      { name: 'medium', width: 800, height: 600, fit: 'inside' },
    ]);
  });

  it('uses width as height when height is omitted', () => {
    const variants = parseVariantConfig('square:300x');
    expect(variants[0]).toEqual({ name: 'square', width: 300, height: 300, fit: 'inside' });
  });

  it('generates processed file names with target format', () => {
    expect(getProcessedFileName('photo.jpg', 'master')).toBe('photo.webp');
    expect(getProcessedFileName('photo.jpg', 'thumbnail')).toBe('photo-thumbnail.webp');
    expect(getProcessedFileName('my.image.png', 'medium')).toBe('my.image-medium.webp');
  });

  it('processes an image into master and variants', async () => {
    // Create a 1000x1000 red PNG
    const buffer = await sharp({
      create: { width: 1000, height: 1000, channels: 3, background: { r: 255, g: 0, b: 0 } },
    })
      .png()
      .toBuffer();

    const result = await processImage(buffer, 'photo.png');

    expect(result.master.width).toBeLessThanOrEqual(800);
    expect(result.master.height).toBeLessThanOrEqual(600);
    expect(result.master.mimetype).toBe('image/webp');
    expect(result.master.format).toBe('webp');
    expect(result.master.size).toBeGreaterThan(0);

    expect(result.variants).toHaveLength(2);

    const thumbnail = result.variants.find((v) => v.name === 'thumbnail');
    expect(thumbnail).toBeDefined();
    expect(thumbnail!.width).toBeLessThanOrEqual(150);
    expect(thumbnail!.height).toBeLessThanOrEqual(150);

    const small = result.variants.find((v) => v.name === 'small');
    expect(small).toBeDefined();
    expect(small!.width).toBeLessThanOrEqual(400);
    expect(small!.height).toBeLessThanOrEqual(300);
  });

  it('throws when processing is disabled', async () => {
    const { env } = await import('../../config/env');
    env.IMAGE_PROCESSING_ENABLED = false;

    const buffer = await sharp({
      create: { width: 100, height: 100, channels: 3, background: 'red' },
    })
      .png()
      .toBuffer();

    await expect(processImage(buffer, 'photo.png')).rejects.toThrow('Image processing is disabled');

    env.IMAGE_PROCESSING_ENABLED = true;
  });

  it('throws for invalid image data', async () => {
    await expect(processImage(Buffer.from('not an image'), 'photo.png')).rejects.toThrow(
      'Invalid or unsupported image file'
    );
  });
});
