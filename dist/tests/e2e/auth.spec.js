"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const fixtures_1 = require("./fixtures");
test_1.test.describe('Authentication', () => {
    test_1.test.beforeEach(async () => {
        await (0, fixtures_1.cleanupDatabase)();
    });
    (0, test_1.test)('registers a new user and logs in', async ({ request }) => {
        const email = 'auth-e2e@example.com';
        const password = 'Password123!';
        const registered = await (0, fixtures_1.registerUser)(request, email, password);
        (0, test_1.expect)(registered.accessToken).toBeDefined();
        (0, test_1.expect)(registered.refreshToken).toBeDefined();
        const loggedIn = await (0, fixtures_1.loginUser)(request, email, password);
        (0, test_1.expect)(loggedIn.accessToken).toBeDefined();
        const me = await request.get('/api/v1/auth/me', {
            headers: { Authorization: `Bearer ${loggedIn.accessToken}` },
        });
        (0, test_1.expect)(me.ok()).toBeTruthy();
        const body = await me.json();
        (0, test_1.expect)(body.success).toBe(true);
        (0, test_1.expect)(body.data.email).toBe(email);
    });
    (0, test_1.test)('rejects login with invalid credentials', async ({ request }) => {
        await (0, fixtures_1.registerUser)(request, 'bad-auth@example.com');
        const response = await request.post('/api/v1/auth/login', {
            data: { email: 'bad-auth@example.com', password: 'wrong-password' },
        });
        (0, test_1.expect)(response.status()).toBe(401);
        const body = await response.json();
        (0, test_1.expect)(body.success).toBe(false);
    });
    (0, test_1.test)('rotates refresh tokens', async ({ request }) => {
        const { refreshToken } = await (0, fixtures_1.registerUser)(request, 'refresh@example.com');
        const response = await request.post('/api/v1/auth/refresh', {
            data: { refreshToken },
        });
        (0, test_1.expect)(response.ok()).toBeTruthy();
        const body = await response.json();
        (0, test_1.expect)(body.success).toBe(true);
        (0, test_1.expect)(body.data.accessToken).toBeDefined();
        (0, test_1.expect)(body.data.refreshToken).toBeDefined();
    });
});
//# sourceMappingURL=auth.spec.js.map