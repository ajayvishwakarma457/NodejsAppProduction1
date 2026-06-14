"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const fixtures_1 = require("./fixtures");
test_1.test.describe('Users', () => {
    test_1.test.beforeEach(async () => {
        await (0, fixtures_1.cleanupDatabase)();
    });
    (0, test_1.test)('allows admins to list and create users', async ({ request }) => {
        const admin = await (0, fixtures_1.createAdminUser)(request, `admin-users@example.com`);
        await (0, fixtures_1.registerUser)(request, `member-users@example.com`);
        const list = await request.get('/api/v1/users?page=1&limit=10', {
            headers: { Authorization: `Bearer ${admin.accessToken}` },
        });
        (0, test_1.expect)(list.ok()).toBeTruthy();
        const listBody = await list.json();
        (0, test_1.expect)(listBody.success).toBe(true);
        (0, test_1.expect)(listBody.data.length).toBeGreaterThanOrEqual(2);
        const create = await request.post('/api/v1/users', {
            headers: { Authorization: `Bearer ${admin.accessToken}` },
            data: {
                firstName: 'Created',
                lastName: 'ByAdmin',
                email: `created-admin@example.com`,
                password: 'Password123!',
                role: 'member',
            },
        });
        (0, test_1.expect)(create.ok()).toBeTruthy();
        const createBody = await create.json();
        (0, test_1.expect)(createBody.success).toBe(true);
        (0, test_1.expect)(createBody.data.email).toBe('created-admin@example.com');
    });
    (0, test_1.test)('forbids non-admins from listing users', async ({ request }) => {
        const user = await (0, fixtures_1.registerUser)(request, `member-deny@example.com`);
        const response = await request.get('/api/v1/users', {
            headers: { Authorization: `Bearer ${user.accessToken}` },
        });
        (0, test_1.expect)(response.status()).toBe(403);
    });
    (0, test_1.test)('allows users to retrieve their own profile', async ({ request }) => {
        const user = await (0, fixtures_1.registerUser)(request, `member-self@example.com`);
        const response = await request.get(`/api/v1/users/${user.id}`, {
            headers: { Authorization: `Bearer ${user.accessToken}` },
        });
        (0, test_1.expect)(response.ok()).toBeTruthy();
        const body = await response.json();
        (0, test_1.expect)(body.data.id).toBe(user.id);
    });
    (0, test_1.test)('forbids users from retrieving other profiles', async ({ request }) => {
        const userOne = await (0, fixtures_1.registerUser)(request, `member-one@example.com`);
        const userTwo = await (0, fixtures_1.registerUser)(request, `member-two@example.com`);
        const response = await request.get(`/api/v1/users/${userTwo.id}`, {
            headers: { Authorization: `Bearer ${userOne.accessToken}` },
        });
        (0, test_1.expect)(response.status()).toBe(403);
    });
});
//# sourceMappingURL=users.spec.js.map