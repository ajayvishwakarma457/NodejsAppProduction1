"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const promises_1 = __importDefault(require("fs/promises"));
const sharp_1 = __importDefault(require("sharp"));
const storage_service_1 = require("../../services/storage.service");
vitest_1.vi.mock('../../config/env', () => ({
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
(0, vitest_1.describe)('storageService image upload', () => {
    (0, vitest_1.beforeEach)(async () => {
        await promises_1.default.mkdir('uploads', { recursive: true });
    });
    (0, vitest_1.afterEach)(async () => {
        try {
            await promises_1.default.rm('uploads', { recursive: true, force: true });
        }
        catch {
            // ignore
        }
    });
    (0, vitest_1.it)('processes images and uploads variants when enabled', async () => {
        const buffer = await (0, sharp_1.default)({
            create: { width: 800, height: 600, channels: 3, background: 'blue' },
        })
            .png()
            .toBuffer();
        const result = await storage_service_1.storageService.upload({
            fieldname: 'file',
            originalname: 'photo.png',
            encoding: '7bit',
            mimetype: 'image/png',
            size: buffer.length,
            buffer,
        }, 'test-images');
        (0, vitest_1.expect)(result.mimetype).toBe('image/webp');
        (0, vitest_1.expect)(result.variants).toBeDefined();
        (0, vitest_1.expect)(result.variants).toHaveLength(2);
        const master = result.variants.find((v) => v.name === 'master');
        const thumbnail = result.variants.find((v) => v.name === 'thumbnail');
        (0, vitest_1.expect)(master).toBeDefined();
        (0, vitest_1.expect)(master.width).toBeLessThanOrEqual(400);
        (0, vitest_1.expect)(master.height).toBeLessThanOrEqual(300);
        (0, vitest_1.expect)(thumbnail).toBeDefined();
        (0, vitest_1.expect)(thumbnail.width).toBeLessThanOrEqual(100);
        (0, vitest_1.expect)(thumbnail.height).toBeLessThanOrEqual(100);
        // All variants should exist on disk
        for (const variant of result.variants) {
            (0, vitest_1.expect)(await storage_service_1.storageService.exists(variant.key)).toBe(true);
        }
    });
    (0, vitest_1.it)('skips image processing for non-image files', async () => {
        const result = await storage_service_1.storageService.upload({
            fieldname: 'file',
            originalname: 'document.pdf',
            encoding: '7bit',
            mimetype: 'application/pdf',
            size: 12,
            buffer: Buffer.from('hello world'),
        }, 'test-files');
        (0, vitest_1.expect)(result.mimetype).toBe('application/pdf');
        (0, vitest_1.expect)(result.variants).toBeUndefined();
    });
});
//# sourceMappingURL=storage-image.test.js.map