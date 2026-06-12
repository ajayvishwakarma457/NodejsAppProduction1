"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProcessedFileName = exports.processImage = exports.parseVariantConfig = exports.isImage = void 0;
const sharp_1 = __importDefault(require("sharp"));
const env_1 = require("../config/env");
const logger_1 = require("../config/logger");
const ApiError_1 = require("./ApiError");
const ALLOWED_IMAGE_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif',
    'image/tiff',
]);
const EXTENSION_BY_FORMAT = {
    webp: '.webp',
    jpeg: '.jpg',
    jpg: '.jpg',
    png: '.png',
    avif: '.avif',
    tiff: '.tiff',
    gif: '.gif',
};
const MIME_TYPE_BY_FORMAT = {
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
const isImage = (mimetype) => ALLOWED_IMAGE_MIME_TYPES.has(mimetype);
exports.isImage = isImage;
/**
 * Parse the IMAGE_VARIANTS environment variable into structured config.
 * Format: name:width[xheight][:fit],...
 * Examples:
 *   thumbnail:150x150:cover
 *   medium:800x600:inside
 *   banner:1920x
 */
const parseVariantConfig = (raw = env_1.env.IMAGE_VARIANTS) => {
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
            fit: fit || 'inside',
        };
    });
};
exports.parseVariantConfig = parseVariantConfig;
/**
 * Replace the file extension with the target output format extension.
 */
const replaceExtension = (originalName, format) => {
    const ext = EXTENSION_BY_FORMAT[format] || `.${format}`;
    const base = originalName.replace(/\.[^/.]+$/, '');
    return `${base}${ext}`;
};
/**
 * Process a single image buffer through Sharp.
 */
const processImageBuffer = async (buffer, config) => {
    const { width, height, fit, quality, format } = config;
    let pipeline = (0, sharp_1.default)(buffer, { animated: format === 'gif' }).resize(width, height, {
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
            throw ApiError_1.ApiError.internal(`Unsupported image output format: ${format}`);
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
const processImage = async (buffer, originalName) => {
    if (!env_1.env.IMAGE_PROCESSING_ENABLED) {
        throw ApiError_1.ApiError.internal('Image processing is disabled');
    }
    try {
        const format = env_1.env.IMAGE_OUTPUT_FORMAT;
        const quality = env_1.env.IMAGE_QUALITY;
        const variantsConfig = (0, exports.parseVariantConfig)();
        // Master image
        const master = await processImageBuffer(buffer, {
            width: env_1.env.IMAGE_MAX_WIDTH,
            height: env_1.env.IMAGE_MAX_HEIGHT,
            fit: 'inside',
            quality,
            format,
        });
        master.name = 'master';
        // Variants
        const variants = [];
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
        logger_1.logger.info('Image processed', {
            originalName,
            format,
            masterSize: master.size,
            variants: variants.map((v) => ({ name: v.name, width: v.width, height: v.height })),
        });
        return { master, variants };
    }
    catch (error) {
        logger_1.logger.error('Image processing failed', {
            originalName,
            error: error instanceof Error ? error.message : error,
        });
        if (error instanceof ApiError_1.ApiError) {
            throw error;
        }
        throw ApiError_1.ApiError.badRequest('Invalid or unsupported image file');
    }
};
exports.processImage = processImage;
/**
 * Get the target filename for a processed image variant.
 */
const getProcessedFileName = (originalName, variantName) => {
    const format = env_1.env.IMAGE_OUTPUT_FORMAT;
    const baseName = replaceExtension(originalName, format);
    if (variantName === 'master') {
        return baseName;
    }
    return baseName.replace(/\.[^/.]+$/, '') + `-${variantName}` + `.${format}`;
};
exports.getProcessedFileName = getProcessedFileName;
//# sourceMappingURL=image-processor.js.map