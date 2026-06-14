"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const sharp_1 = __importDefault(require("sharp"));
const image_processor_1 = require("../../utils/image-processor");
vitest_1.vi.mock('../../config/env', () => ({
    env: {
        IMAGE_PROCESSING_ENABLED: true,
        IMAGE_MAX_WIDTH: 800,
        IMAGE_MAX_HEIGHT: 600,
        IMAGE_QUALITY: 80,
        IMAGE_OUTPUT_FORMAT: 'webp',
        IMAGE_VARIANTS: 'thumbnail:150x150:cover,small:400x300:inside',
    },
}));
(0, vitest_1.describe)('image-processor', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.it)('detects image MIME types', () => {
        (0, vitest_1.expect)((0, image_processor_1.isImage)('image/jpeg')).toBe(true);
        (0, vitest_1.expect)((0, image_processor_1.isImage)('image/png')).toBe(true);
        (0, vitest_1.expect)((0, image_processor_1.isImage)('image/webp')).toBe(true);
        (0, vitest_1.expect)((0, image_processor_1.isImage)('application/pdf')).toBe(false);
        (0, vitest_1.expect)((0, image_processor_1.isImage)('text/plain')).toBe(false);
    });
    (0, vitest_1.it)('parses variant config', () => {
        const variants = (0, image_processor_1.parseVariantConfig)('thumbnail:150x150:cover,medium:800x600:inside');
        (0, vitest_1.expect)(variants).toEqual([
            { name: 'thumbnail', width: 150, height: 150, fit: 'cover' },
            { name: 'medium', width: 800, height: 600, fit: 'inside' },
        ]);
    });
    (0, vitest_1.it)('uses width as height when height is omitted', () => {
        const variants = (0, image_processor_1.parseVariantConfig)('square:300x');
        (0, vitest_1.expect)(variants[0]).toEqual({ name: 'square', width: 300, height: 300, fit: 'inside' });
    });
    (0, vitest_1.it)('generates processed file names with target format', () => {
        (0, vitest_1.expect)((0, image_processor_1.getProcessedFileName)('photo.jpg', 'master')).toBe('photo.webp');
        (0, vitest_1.expect)((0, image_processor_1.getProcessedFileName)('photo.jpg', 'thumbnail')).toBe('photo-thumbnail.webp');
        (0, vitest_1.expect)((0, image_processor_1.getProcessedFileName)('my.image.png', 'medium')).toBe('my.image-medium.webp');
    });
    (0, vitest_1.it)('processes an image into master and variants', async () => {
        // Create a 1000x1000 red PNG
        const buffer = await (0, sharp_1.default)({
            create: { width: 1000, height: 1000, channels: 3, background: { r: 255, g: 0, b: 0 } },
        })
            .png()
            .toBuffer();
        const result = await (0, image_processor_1.processImage)(buffer, 'photo.png');
        (0, vitest_1.expect)(result.master.width).toBeLessThanOrEqual(800);
        (0, vitest_1.expect)(result.master.height).toBeLessThanOrEqual(600);
        (0, vitest_1.expect)(result.master.mimetype).toBe('image/webp');
        (0, vitest_1.expect)(result.master.format).toBe('webp');
        (0, vitest_1.expect)(result.master.size).toBeGreaterThan(0);
        (0, vitest_1.expect)(result.variants).toHaveLength(2);
        const thumbnail = result.variants.find((v) => v.name === 'thumbnail');
        (0, vitest_1.expect)(thumbnail).toBeDefined();
        (0, vitest_1.expect)(thumbnail.width).toBeLessThanOrEqual(150);
        (0, vitest_1.expect)(thumbnail.height).toBeLessThanOrEqual(150);
        const small = result.variants.find((v) => v.name === 'small');
        (0, vitest_1.expect)(small).toBeDefined();
        (0, vitest_1.expect)(small.width).toBeLessThanOrEqual(400);
        (0, vitest_1.expect)(small.height).toBeLessThanOrEqual(300);
    });
    (0, vitest_1.it)('throws when processing is disabled', async () => {
        const { env } = await Promise.resolve().then(() => __importStar(require('../../config/env')));
        env.IMAGE_PROCESSING_ENABLED = false;
        const buffer = await (0, sharp_1.default)({
            create: { width: 100, height: 100, channels: 3, background: 'red' },
        })
            .png()
            .toBuffer();
        await (0, vitest_1.expect)((0, image_processor_1.processImage)(buffer, 'photo.png')).rejects.toThrow('Image processing is disabled');
        env.IMAGE_PROCESSING_ENABLED = true;
    });
    (0, vitest_1.it)('throws for invalid image data', async () => {
        await (0, vitest_1.expect)((0, image_processor_1.processImage)(Buffer.from('not an image'), 'photo.png')).rejects.toThrow('Invalid or unsupported image file');
    });
});
//# sourceMappingURL=image-processor.test.js.map