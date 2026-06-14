"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
test_1.test.describe('Health', () => {
    (0, test_1.test)('GET /health returns a healthy status', async ({ request }) => {
        const response = await request.get('/health');
        (0, test_1.expect)(response.ok()).toBeTruthy();
        const body = await response.json();
        (0, test_1.expect)(body.success).toBe(true);
        (0, test_1.expect)(body.message).toBe('OK');
        (0, test_1.expect)(body.checks.mongodb).toBe('ok');
        (0, test_1.expect)(body.checks.redis).toBe('ok');
    });
});
//# sourceMappingURL=health.spec.js.map