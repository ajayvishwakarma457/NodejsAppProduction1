"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const fixtures_1 = require("./fixtures");
fixtures_1.test.describe('Teams', () => {
    fixtures_1.test.beforeEach(async () => {
        await (0, fixtures_1.cleanupDatabase)();
    });
    (0, fixtures_1.test)('creates, reads, updates, and deletes a team', async ({ request, authUser }) => {
        // Create
        const create = await request.post('/api/v1/teams', {
            headers: { Authorization: `Bearer ${authUser.accessToken}` },
            data: { name: 'E2E Team', description: 'Created by Playwright' },
        });
        (0, test_1.expect)(create.ok()).toBeTruthy();
        const created = await create.json();
        (0, test_1.expect)(created.success).toBe(true);
        (0, test_1.expect)(created.data.name).toBe('E2E Team');
        (0, test_1.expect)(created.data.ownerId).toBe(authUser.id);
        const teamId = created.data.id;
        // Read
        const read = await request.get(`/api/v1/teams/${teamId}`, {
            headers: { Authorization: `Bearer ${authUser.accessToken}` },
        });
        (0, test_1.expect)(read.ok()).toBeTruthy();
        const readBody = await read.json();
        (0, test_1.expect)(readBody.data.name).toBe('E2E Team');
        // Update
        const update = await request.patch(`/api/v1/teams/${teamId}`, {
            headers: { Authorization: `Bearer ${authUser.accessToken}` },
            data: { name: 'E2E Team Updated' },
        });
        (0, test_1.expect)(update.ok()).toBeTruthy();
        const updated = await update.json();
        (0, test_1.expect)(updated.data.name).toBe('E2E Team Updated');
        // Delete
        const remove = await request.delete(`/api/v1/teams/${teamId}`, {
            headers: { Authorization: `Bearer ${authUser.accessToken}` },
        });
        (0, test_1.expect)(remove.ok()).toBeTruthy();
    });
    (0, fixtures_1.test)('forbids non-owners from updating a team', async ({ request, authUser }) => {
        const create = await request.post('/api/v1/teams', {
            headers: { Authorization: `Bearer ${authUser.accessToken}` },
            data: { name: 'Owner Team', description: 'Owned by auth user' },
        });
        (0, test_1.expect)(create.ok()).toBeTruthy();
        const createBody = await create.json();
        (0, test_1.expect)(createBody.success).toBe(true);
        const teamId = createBody.data.id;
        // Create a second user and attempt an update.
        const other = await request.post('/api/v1/auth/register', {
            data: {
                firstName: 'Other',
                lastName: 'User',
                email: `other-${Date.now()}@example.com`,
                password: 'Password123!',
                confirmPassword: 'Password123!',
            },
        });
        (0, test_1.expect)(other.ok()).toBeTruthy();
        const otherBody = await other.json();
        const otherToken = otherBody.data.tokens.accessToken;
        const update = await request.patch(`/api/v1/teams/${teamId}`, {
            headers: { Authorization: `Bearer ${otherToken}` },
            data: { name: 'Hijacked' },
        });
        (0, test_1.expect)(update.status()).toBe(403);
    });
});
//# sourceMappingURL=teams.spec.js.map