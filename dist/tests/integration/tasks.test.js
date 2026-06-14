"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const http_status_codes_1 = require("http-status-codes");
const helpers_1 = require("./helpers");
(0, vitest_1.describe)('GET /api/v1/tasks/dashboard', () => {
    (0, vitest_1.it)('returns task dashboard data', async () => {
        const { session } = await (0, helpers_1.register)({ email: 'task-dashboard@example.com' });
        const { teamId } = await (0, helpers_1.createTeam)(session.accessToken);
        const { projectId } = await (0, helpers_1.createProject)(session.accessToken, { teamId });
        await (0, helpers_1.createTask)(session.accessToken, { projectId, assignedTo: session.userId });
        const response = await (0, helpers_1.authRequest)('get', '/api/v1/tasks/dashboard', session.accessToken);
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.OK);
        (0, vitest_1.expect)(response.body.data.statusDistribution).toBeDefined();
    });
});
(0, vitest_1.describe)('GET /api/v1/tasks', () => {
    (0, vitest_1.it)('lists tasks created by or assigned to the user', async () => {
        const { session } = await (0, helpers_1.register)({ email: 'task-creator-list@example.com' });
        const { teamId } = await (0, helpers_1.createTeam)(session.accessToken);
        const { projectId } = await (0, helpers_1.createProject)(session.accessToken, { teamId });
        await (0, helpers_1.createTask)(session.accessToken, { projectId, assignedTo: session.userId });
        const response = await (0, helpers_1.authRequest)('get', '/api/v1/tasks', session.accessToken);
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.OK);
        (0, vitest_1.expect)(response.body.data.length).toBeGreaterThanOrEqual(1);
    });
    (0, vitest_1.it)('filters tasks by projectId', async () => {
        const { session } = await (0, helpers_1.register)({ email: 'task-filter@example.com' });
        const { teamId } = await (0, helpers_1.createTeam)(session.accessToken);
        const { projectId } = await (0, helpers_1.createProject)(session.accessToken, { teamId });
        await (0, helpers_1.createTask)(session.accessToken, { projectId, assignedTo: session.userId });
        const response = await (0, helpers_1.authRequest)('get', '/api/v1/tasks', session.accessToken).query({
            projectId,
        });
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.OK);
        (0, vitest_1.expect)(response.body.data.every((t) => t.projectId === projectId)).toBe(true);
    });
});
(0, vitest_1.describe)('GET /api/v1/tasks/:id', () => {
    (0, vitest_1.it)('returns a task by id', async () => {
        const { session } = await (0, helpers_1.register)({ email: 'task-creator-get@example.com' });
        const { teamId } = await (0, helpers_1.createTeam)(session.accessToken);
        const { projectId } = await (0, helpers_1.createProject)(session.accessToken, { teamId });
        const { taskId } = await (0, helpers_1.createTask)(session.accessToken, {
            projectId,
            assignedTo: session.userId,
        });
        const response = await (0, helpers_1.authRequest)('get', `/api/v1/tasks/${taskId}`, session.accessToken);
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.OK);
        (0, vitest_1.expect)(response.body.data.id).toBe(taskId);
    });
});
(0, vitest_1.describe)('POST /api/v1/tasks', () => {
    (0, vitest_1.it)('creates a task under a project', async () => {
        const { session } = await (0, helpers_1.register)({ email: 'task-creator-create@example.com' });
        const { teamId } = await (0, helpers_1.createTeam)(session.accessToken);
        const { projectId } = await (0, helpers_1.createProject)(session.accessToken, { teamId });
        const response = await (0, helpers_1.authRequest)('post', '/api/v1/tasks', session.accessToken).send({
            title: 'New Task',
            description: 'A test task',
            projectId,
            assignedTo: session.userId,
            priority: 'high',
        });
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.CREATED);
        (0, vitest_1.expect)(response.body.data.title).toBe('New Task');
        (0, vitest_1.expect)(response.body.data.createdBy).toBe(session.userId);
        (0, vitest_1.expect)(response.body.data.projectId).toBe(projectId);
    });
    (0, vitest_1.it)('rejects missing projectId', async () => {
        const { session } = await (0, helpers_1.register)({ email: 'task-creator-invalid@example.com' });
        const response = await (0, helpers_1.authRequest)('post', '/api/v1/tasks', session.accessToken).send({
            title: 'Orphan Task',
            description: 'No project',
            assignedTo: session.userId,
        });
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.BAD_REQUEST);
    });
});
(0, vitest_1.describe)('PATCH /api/v1/tasks/:id', () => {
    (0, vitest_1.it)('allows the creator to update the task', async () => {
        const { session } = await (0, helpers_1.register)({ email: 'task-creator-update@example.com' });
        const { teamId } = await (0, helpers_1.createTeam)(session.accessToken);
        const { projectId } = await (0, helpers_1.createProject)(session.accessToken, { teamId });
        const { taskId } = await (0, helpers_1.createTask)(session.accessToken, {
            projectId,
            assignedTo: session.userId,
        });
        const response = await (0, helpers_1.authRequest)('patch', `/api/v1/tasks/${taskId}`, session.accessToken).send({
            status: 'in-progress',
        });
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.OK);
        (0, vitest_1.expect)(response.body.data.status).toBe('in-progress');
    });
    (0, vitest_1.it)('forbids non-creators from updating the task', async () => {
        const { session: creator } = await (0, helpers_1.register)({ email: 'task-creator-update-deny@example.com' });
        const { session: intruder } = await (0, helpers_1.register)({ email: 'task-intruder-update@example.com' });
        const { teamId } = await (0, helpers_1.createTeam)(creator.accessToken);
        const { projectId } = await (0, helpers_1.createProject)(creator.accessToken, { teamId });
        const { taskId } = await (0, helpers_1.createTask)(creator.accessToken, {
            projectId,
            assignedTo: creator.userId,
        });
        const response = await (0, helpers_1.authRequest)('patch', `/api/v1/tasks/${taskId}`, intruder.accessToken).send({
            status: 'done',
        });
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.FORBIDDEN);
    });
});
(0, vitest_1.describe)('DELETE /api/v1/tasks/:id', () => {
    (0, vitest_1.it)('allows the creator to delete the task', async () => {
        const { session } = await (0, helpers_1.register)({ email: 'task-creator-delete@example.com' });
        const { teamId } = await (0, helpers_1.createTeam)(session.accessToken);
        const { projectId } = await (0, helpers_1.createProject)(session.accessToken, { teamId });
        const { taskId } = await (0, helpers_1.createTask)(session.accessToken, {
            projectId,
            assignedTo: session.userId,
        });
        const response = await (0, helpers_1.authRequest)('delete', `/api/v1/tasks/${taskId}`, session.accessToken);
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.NO_CONTENT);
    });
    (0, vitest_1.it)('forbids non-creators from deleting the task', async () => {
        const { session: creator } = await (0, helpers_1.register)({ email: 'task-creator-delete-deny@example.com' });
        const { session: intruder } = await (0, helpers_1.register)({ email: 'task-intruder-delete@example.com' });
        const { teamId } = await (0, helpers_1.createTeam)(creator.accessToken);
        const { projectId } = await (0, helpers_1.createProject)(creator.accessToken, { teamId });
        const { taskId } = await (0, helpers_1.createTask)(creator.accessToken, {
            projectId,
            assignedTo: creator.userId,
        });
        const response = await (0, helpers_1.authRequest)('delete', `/api/v1/tasks/${taskId}`, intruder.accessToken);
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.FORBIDDEN);
    });
});
//# sourceMappingURL=tasks.test.js.map