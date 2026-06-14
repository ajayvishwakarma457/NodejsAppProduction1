"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const helpers_1 = require("./helpers");
(0, vitest_1.describe)('GET /health', () => {
    (0, vitest_1.it)('returns 200 when MongoDB and Redis are healthy', async () => {
        const response = await helpers_1.api.get('/health');
        (0, vitest_1.expect)(response.status).toBe(200);
        (0, vitest_1.expect)(response.body.success).toBe(true);
        (0, vitest_1.expect)(response.body.checks).toMatchObject({
            server: 'ok',
            mongodb: 'ok',
            redis: 'ok',
        });
        (0, vitest_1.expect)(response.body.timestamp).toBeDefined();
    });
});
//# sourceMappingURL=health.test.js.map