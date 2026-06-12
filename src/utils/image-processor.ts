import sharp from 'sharp';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { ApiError } from './ApiError';

export type ImageFit = 'cover' | 'contain' | 'fill' | 'inside' | 'outside';

export interface ImageVariantConfig {
  name: string;
  width: number;
  height: number;
  fit: ImageFit;
}

export interface ProcessedImage {
  name: string;
  buffer: Buffer;
  width: number;
  height: number;
  size: number;
  mimetype: string;
  format: string;
}

export interface ImageProcessingResult {
  master: ProcessedImage;
  variants: ProcessedImage[];
}

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/tiff',
]);

const EXTENSION_BY_FORMAT: Record<string, string> = {
  webp: '.webp',
  jpeg: '.jpg',
  jpg: '.jpg',
  png: '.png',
  avif: '.avif',
  tiff: '.tiff',
  gif: '.gif',
};

const MIME_TYPE_BY_FORMAT: Record<string, string> = {
  webp: 'image/webp',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  avif: 'image/avif',
  tiff: 'image/tiff',
  gif: 'image/gif',
};

/**
 * Check whether the given MIME type is a supported image format.
 */
export const isImage = (mimetype: string): boolean => ALLOWED_IMAGE_MIME_TYPES.has(mimetype);

/**
 * Parse the IMAGE_VARIANTS environment variable into structured config.
 * Format: name:width[xheight][:fit],...
 * Examples:
 *   thumbnail:150x150:cover
 *   medium:800x600:inside
 *   banner:1920x
 */
export const parseVariantConfig = (raw = env.IMAGE_VARIANTS): ImageVariantConfig[] => {
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [name, dimensions, fit] = entry.split(':');
      const [widthStr, heightStr] = dimensions.split('x');
      const width = parseInt(widthStr, 10);
      const height = heightStr ? parseInt(heightStr, 10) : width;

      if (!name || Number.isNaN(width) || width <= 0) {
        throw new Error(`Invalid image variant config: ${entry}`);
      }

      return {
        name,
        width,
        height: Number.isNaN(height) || height <= 0 ? width : height,
        fit: (fit as ImageFit) || 'inside',
      };
    });
};

/**
 * Replace the file extension with the target output format extension.
 */
const replaceExtension = (originalName: string, format: string): string => {
  const ext = EXTENSION_BY_FORMAT[format] || `.${format}`;
  const base = originalName.replace(/\.[^/.]+$/, '');
  return `${base}${ext}`;
};

/**
 * Process a single image buffer through Sharp.
 */
const processImageBuffer = async (
  buffer: Buffer,
  config: { width: number; height: number; fit: ImageFit; quality: number; format: string }
): Promise<ProcessedImage> => {
  const { width, height, fit, quality, format } = config;

  let pipeline = sharp(buffer, { animated: format === 'gif' }).resize(width, height, {
    fit,
    withoutEnlargement: true,
  });

  switch (format) {
    case 'webp':
      pipeline = pipeline.webp({ quality, effort: 4 });
      break;
    case 'jpeg':
    case 'jpg':
      pipeline = pipeline.jpeg({ quality, progressive: true, mozjpeg: true });
      break;
    case 'png':
      pipeline = pipeline.png({ quality, effort: 7 });
      break;
    case 'avif':
      pipeline = pipeline.avif({ quality, effort: 4 });
      break;
    default:
      throw ApiError.internal(`Unsupported image output format: ${format}`);
  }

  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });

  return {
    name: 'master',
    buffer: data,
    width: info.width,
    height: info.height,
    size: data.length,
    mimetype: MIME_TYPE_BY_FORMAT[format] || `image/${format}`,
    format,
  };
};

/**
 * Process an uploaded image into a master image and configured variants.
 *
 * - Master is resized to IMAGE_MAX_WIDTH x IMAGE_MAX_HEIGHT and converted
 *   to IMAGE_OUTPUT_FORMAT.
 * - Variants are generated from the original buffer to preserve quality.
 */
export const processImage = async (
  buffer: Buffer,
  originalName: string
): Promise<ImageProcessingResult> => {
  if (!env.IMAGE_PROCESSING_ENABLED) {
    throw ApiError.internal('Image processing is disabled');
  }

  try {
    const format = env.IMAGE_OUTPUT_FORMAT;
    const quality = env.IMAGE_QUALITY;
    const variantsConfig = parseVariantConfig();

    // Master image
    const master = await processImageBuffer(buffer, {
      width: env.IMAGE_MAX_WIDTH,
      height: env.IMAGE_MAX_HEIGHT,
      fit: 'inside',
      quality,
      format,
    });
    master.name = 'master';

    // Variants
    const variants: ProcessedImage[] = [];
    for (const config of variantsConfig) {
      const variant = await processImageBuffer(buffer, {
        width: config.width,
        height: config.height,
        fit: config.fit,
        quality,
        format,
      });
      variant.name = config.name;
      variants.push(variant);
    }

    logger.info('Image processed', {
      originalName,
      format,
      masterSize: master.size,
      variants: variants.map((v) => ({ name: v.name, width: v.width, height: v.height })),
    });

    return { master, variants };
  } catch (error) {
    logger.error('Image processing failed', {
      originalName,
      error: error instanceof Error ? error.message : error,
    });

    if (error instanceof ApiError) {
      throw error;
    }

    throw ApiError.badRequest('Invalid or unsupported image file');
  }
};

/**
 * Get the target filename for a processed image variant.
 */
export const getProcessedFileName = (originalName: string, variantName: string): string => {
  const format = env.IMAGE_OUTPUT_FORMAT;
  const baseName = replaceExtension(originalName, format);
  if (variantName === 'master') {
    return baseName;
  }
  return baseName.replace(/\.[^/.]+$/, '') + `-${variantName}` + `.${format}`;
};
