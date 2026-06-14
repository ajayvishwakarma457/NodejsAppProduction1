"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const fixtures_1 = require("./fixtures");
test_1.test.describe('Tasks', () => {
    test_1.test.beforeEach(async () => {
        await (0, fixtures_1.cleanupDatabase)();
    });
    (0, test_1.test)('creates, reads, updates, and deletes a task under a project', async ({ request }) => {
        const user = await (0, fixtures_1.registerUser)(request, `task-creator@example.com`);
        const team = await (0, fixtures_1.createTeam)(request, user.accessToken);
        const project = await (0, fixtures_1.createProject)(request, user.accessToken, team.id);
        const create = await request.post('/api/v1/tasks', {
            headers: { Authorization: `Bearer ${user.accessToken}` },
            data: {
                title: 'E2E Task',
                description: 'Created by Playwright',
                projectId: project.id,
                assignedTo: user.id,
                priority: 'high',
            },
        });
        (0, test_1.expect)(create.ok()).toBeTruthy();
        const created = await create.json();
        (0, test_1.expect)(created.success).toBe(true);
        (0, test_1.expect)(created.data.title).toBe('E2E Task');
        (0, test_1.expect)(created.data.createdBy).toBe(user.id);
        const taskId = created.data.id;
        const read = await request.get(`/api/v1/tasks/${taskId}`, {
            headers: { Authorization: `Bearer ${user.accessToken}` },
        });
        (0, test_1.expect)(read.ok()).toBeTruthy();
        (0, test_1.expect)((await read.json()).data.title).toBe('E2E Task');
        const update = await request.patch(`/api/v1/tasks/${taskId}`, {
            headers: { Authorization: `Bearer ${user.accessToken}` },
            data: { title: 'E2E Task Updated' },
        });
        (0, test_1.expect)(update.ok()).toBeTruthy();
        (0, test_1.expect)((await update.json()).data.title).toBe('E2E Task Updated');
        const remove = await request.delete(`/api/v1/tasks/${taskId}`, {
            headers: { Authorization: `Bearer ${user.accessToken}` },
        });
        (0, test_1.expect)(remove.ok()).toBeTruthy();
    });
    (0, test_1.test)('forbids non-creators from updating a task', async ({ request }) => {
        const creator = await (0, fixtures_1.registerUser)(request, `task-creator-deny@example.com`);
        const intruder = await (0, fixtures_1.registerUser)(request, `task-intruder@example.com`);
        const team = await (0, fixtures_1.createTeam)(request, creator.accessToken);
        const project = await (0, fixtures_1.createProject)(request, creator.accessToken, team.id);
        const task = await (0, fixtures_1.createTask)(request, creator.accessToken, project.id, creator.id);
        const update = await request.patch(`/api/v1/tasks/${task.id}`, {
            headers: { Authorization: `Bearer ${intruder.accessToken}` },
            data: { title: 'Hijacked' },
        });
        (0, test_1.expect)(update.status()).toBe(403);
    });
    (0, test_1.test)('lists tasks filtered by projectId', async ({ request }) => {
        const user = await (0, fixtures_1.registerUser)(request, `task-list@example.com`);
        const team = await (0, fixtures_1.createTeam)(request, user.accessToken);
        const project = await (0, fixtures_1.createProject)(request, user.accessToken, team.id);
        await (0, fixtures_1.createTask)(request, user.accessToken, project.id, user.id);
        const response = await request.get(`/api/v1/tasks?projectId=${project.id}`, {
            headers: { Authorization: `Bearer ${user.accessToken}` },
        });
        (0, test_1.expect)(response.ok()).toBeTruthy();
        const body = await response.json();
        (0, test_1.expect)(body.data.every((t) => t.projectId === project.id)).toBe(true);
    });
});
//# sourceMappingURL=tasks.spec.js.map