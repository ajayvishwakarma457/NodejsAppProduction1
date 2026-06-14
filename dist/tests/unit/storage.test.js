"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const promises_1 = __importDefault(require("fs/promises"));
const storage_service_1 = require("../../services/storage.service");
const ApiError_1 = require("../../utils/ApiError");
(0, vitest_1.describe)('storageService', () => {
    const testBuffer = Buffer.from('hello world');
    (0, vitest_1.beforeAll)(async () => {
        await promises_1.default.mkdir('uploads', { recursive: true });
    });
    (0, vitest_1.afterAll)(async () => {
        try {
            await promises_1.default.rm('uploads', { recursive: true, force: true });
        }
        catch {
            // ignore
        }
    });
    (0, vitest_1.it)('should upload a file and return result', async () => {
        const result = await storage_service_1.storageService.upload({
            fieldname: 'file',
            originalname: 'test.txt',
            encoding: 'utf-8',
            mimetype: 'text/plain',
            size: testBuffer.length,
            buffer: testBuffer,
        }, 'test-folder');
        (0, vitest_1.expect)(result.key).toContain('test-folder/');
        (0, vitest_1.expect)(result.url).toContain('/uploads/');
        (0, vitest_1.expect)(result.size).toBe(testBuffer.length);
        (0, vitest_1.expect)(result.originalName).toBe('test.txt');
    });
    (0, vitest_1.it)('should check file existence', async () => {
        const result = await storage_service_1.storageService.upload({
            fieldname: 'file',
            originalname: 'exists.txt',
            encoding: 'utf-8',
            mimetype: 'text/plain',
            size: testBuffer.length,
            buffer: testBuffer,
        }, 'test-folder');
        (0, vitest_1.expect)(await storage_service_1.storageService.exists(result.key)).toBe(true);
    });
    (0, vitest_1.it)('should delete a file', async () => {
        const result = await storage_service_1.storageService.upload({
            fieldname: 'file',
            originalname: 'delete-me.txt',
            encoding: 'utf-8',
            mimetype: 'text/plain',
            size: testBuffer.length,
            buffer: testBuffer,
        }, 'test-folder');
        const deleted = await storage_service_1.storageService.delete(result.key);
        (0, vitest_1.expect)(deleted).toBe(true);
        (0, vitest_1.expect)(await storage_service_1.storageService.exists(result.key)).toBe(false);
    });
    (0, vitest_1.it)('should return false when deleting non-existent file', async () => {
        const deleted = await storage_service_1.storageService.delete('test-folder/non-existent.txt');
        (0, vitest_1.expect)(deleted).toBe(false);
    });
    (0, vitest_1.it)('should generate a unique key', () => {
        const key1 = storage_service_1.storageService.generateKey('photo.jpg', 'avatars');
        const key2 = storage_service_1.storageService.generateKey('photo.jpg', 'avatars');
        (0, vitest_1.expect)(key1).toContain('avatars/');
        (0, vitest_1.expect)(key1).not.toBe(key2);
    });
    (0, vitest_1.it)('should validate allowed file types', () => {
        (0, vitest_1.expect)(() => storage_service_1.storageService.validate({
            fieldname: 'file',
            originalname: 'photo.jpg',
            encoding: '7bit',
            mimetype: 'image/jpeg',
            size: 1024,
        })).not.toThrow();
    });
    (0, vitest_1.it)('should reject disallowed file types', () => {
        (0, vitest_1.expect)(() => storage_service_1.storageService.validate({
            fieldname: 'file',
            originalname: 'script.exe',
            encoding: '7bit',
            mimetype: 'application/x-msdownload',
            size: 1024,
        })).toThrow(ApiError_1.ApiError);
    });
    (0, vitest_1.it)('should reject oversized files', () => {
        (0, vitest_1.expect)(() => storage_service_1.storageService.validate({
            fieldname: 'file',
            originalname: 'huge.png',
            encoding: '7bit',
            mimetype: 'image/png',
            size: 20 * 1024 * 1024, // 20MB > 10MB default
        })).toThrow(ApiError_1.ApiError);
    });
    (0, vitest_1.it)('should get a readable stream', async () => {
        const result = await storage_service_1.storageService.upload({
            fieldname: 'file',
            originalname: 'stream.txt',
            encoding: 'utf-8',
            mimetype: 'text/plain',
            size: testBuffer.length,
            buffer: testBuffer,
        }, 'test-folder');
        const stream = storage_service_1.storageService.getStream(result.key);
        const chunks = [];
        for await (const chunk of stream) {
            chunks.push(Buffer.from(chunk));
        }
        (0, vitest_1.expect)(Buffer.concat(chunks).toString()).toBe('hello world');
    });
});
//# sourceMappingURL=storage.test.js.map