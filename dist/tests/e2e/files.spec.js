"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const fixtures_1 = require("./fixtures");
test_1.test.describe('Files', () => {
    test_1.test.beforeEach(async () => {
        await (0, fixtures_1.cleanupDatabase)();
    });
    (0, test_1.test)('returns 404 when streaming a missing file', async ({ request }) => {
        const user = await (0, fixtures_1.registerUser)(request, `file-missing@example.com`);
        const response = await request.get('/api/v1/files/integration-tests/missing.txt/stream', {
            headers: { Authorization: `Bearer ${user.accessToken}` },
        });
        (0, test_1.expect)(response.status()).toBe(404);
        const body = await response.json();
        (0, test_1.expect)(body.success).toBe(false);
    });
    (0, test_1.test)('rejects multipart init when local provider is active', async ({ request }) => {
        const user = await (0, fixtures_1.registerUser)(request, `file-multipart@example.com`);
        const response = await request.post('/api/v1/files/multipart/init', {
            headers: { Authorization: `Bearer ${user.accessToken}` },
            data: { fileName: 'large-file.zip' },
        });
        (0, test_1.expect)(response.status()).toBe(500);
        const body = await response.json();
        (0, test_1.expect)(body.success).toBe(false);
    });
});
//# sourceMappingURL=files.spec.js.map