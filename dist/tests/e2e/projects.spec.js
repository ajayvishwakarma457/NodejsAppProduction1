"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const fixtures_1 = require("./fixtures");
test_1.test.describe('Projects', () => {
    test_1.test.beforeEach(async () => {
        await (0, fixtures_1.cleanupDatabase)();
    });
    (0, test_1.test)('creates, reads, updates, and deletes a project under a team', async ({ request }) => {
        const user = await (0, fixtures_1.registerUser)(request, `project-owner@example.com`);
        const team = await (0, fixtures_1.createTeam)(request, user.accessToken);
        const create = await request.post('/api/v1/projects', {
            headers: { Authorization: `Bearer ${user.accessToken}` },
            data: { name: 'E2E Project', description: 'Created by Playwright', teamId: team.id },
        });
        (0, test_1.expect)(create.ok()).toBeTruthy();
        const created = await create.json();
        (0, test_1.expect)(created.success).toBe(true);
        (0, test_1.expect)(created.data.name).toBe('E2E Project');
        (0, test_1.expect)(created.data.ownerId).toBe(user.id);
        const projectId = created.data.id;
        const read = await request.get(`/api/v1/projects/${projectId}`, {
            headers: { Authorization: `Bearer ${user.accessToken}` },
        });
        (0, test_1.expect)(read.ok()).toBeTruthy();
        (0, test_1.expect)((await read.json()).data.name).toBe('E2E Project');
        const update = await request.patch(`/api/v1/projects/${projectId}`, {
            headers: { Authorization: `Bearer ${user.accessToken}` },
            data: { name: 'E2E Project Updated' },
        });
        (0, test_1.expect)(update.ok()).toBeTruthy();
        (0, test_1.expect)((await update.json()).data.name).toBe('E2E Project Updated');
        const remove = await request.delete(`/api/v1/projects/${projectId}`, {
            headers: { Authorization: `Bearer ${user.accessToken}` },
        });
        (0, test_1.expect)(remove.ok()).toBeTruthy();
    });
    (0, test_1.test)('forbids non-owners from updating a project', async ({ request }) => {
        const owner = await (0, fixtures_1.registerUser)(request, `project-owner-deny@example.com`);
        const intruder = await (0, fixtures_1.registerUser)(request, `project-intruder@example.com`);
        const team = await (0, fixtures_1.createTeam)(request, owner.accessToken);
        const project = await (0, fixtures_1.createProject)(request, owner.accessToken, team.id);
        const update = await request.patch(`/api/v1/projects/${project.id}`, {
            headers: { Authorization: `Bearer ${intruder.accessToken}` },
            data: { name: 'Hijacked' },
        });
        (0, test_1.expect)(update.status()).toBe(403);
    });
    (0, test_1.test)('rejects a project without a teamId', async ({ request }) => {
        const user = await (0, fixtures_1.registerUser)(request, `project-invalid@example.com`);
        const response = await request.post('/api/v1/projects', {
            headers: { Authorization: `Bearer ${user.accessToken}` },
            data: { name: 'Orphan Project', description: 'No team' },
        });
        (0, test_1.expect)(response.status()).toBe(400);
    });
});
//# sourceMappingURL=projects.spec.js.map