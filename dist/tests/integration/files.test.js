"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const http_status_codes_1 = require("http-status-codes");
const helpers_1 = require("./helpers");
const storage_service_1 = require("../../services/storage.service");
(0, vitest_1.describe)('GET /api/v1/files/:key/stream', () => {
    (0, vitest_1.it)('streams an existing file', async () => {
        const { session } = await (0, helpers_1.register)({ email: 'file-stream@example.com' });
        const upload = await storage_service_1.storageService.upload({
            fieldname: 'file',
            originalname: 'integration-test.txt',
            mimetype: 'text/plain',
            encoding: '7bit',
            size: 12,
            buffer: Buffer.from('hello world!'),
        }, 'integration-tests');
        const response = await (0, helpers_1.authRequest)('get', `/api/v1/files/${encodeURIComponent(upload.key)}/stream`, session.accessToken);
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.OK);
        (0, vitest_1.expect)(response.headers['content-type']).toBe('text/plain');
        (0, vitest_1.expect)(response.text).toBe('hello world!');
        await storage_service_1.storageService.delete(upload.key);
    });
    (0, vitest_1.it)('supports HTTP Range requests', async () => {
        const { session } = await (0, helpers_1.register)({ email: 'file-stream-range@example.com' });
        const upload = await storage_service_1.storageService.upload({
            fieldname: 'file',
            originalname: 'integration-range.txt',
            mimetype: 'text/plain',
            encoding: '7bit',
            size: 12,
            buffer: Buffer.from('hello world!'),
        }, 'integration-tests');
        const response = await (0, helpers_1.authRequest)('get', `/api/v1/files/${encodeURIComponent(upload.key)}/stream`, session.accessToken).set('Range', 'bytes=0-4');
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.PARTIAL_CONTENT);
        (0, vitest_1.expect)(response.headers['content-range']).toMatch(/bytes 0-4\/12/);
        (0, vitest_1.expect)(response.text).toBe('hello');
        await storage_service_1.storageService.delete(upload.key);
    });
    (0, vitest_1.it)('returns 404 for a missing file', async () => {
        const { session } = await (0, helpers_1.register)({ email: 'file-stream-missing@example.com' });
        const response = await (0, helpers_1.authRequest)('get', `/api/v1/files/integration-tests/missing-file.txt/stream`, session.accessToken);
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.NOT_FOUND);
    });
});
(0, vitest_1.describe)('POST /api/v1/files/multipart/*', () => {
    (0, vitest_1.it)('rejects multipart init when local provider is active', async () => {
        const { session } = await (0, helpers_1.register)({ email: 'file-multipart@example.com' });
        const response = await (0, helpers_1.authRequest)('post', '/api/v1/files/multipart/init', session.accessToken).send({
            fileName: 'large-file.zip',
        });
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR);
    });
});
//# sourceMappingURL=files.test.js.map