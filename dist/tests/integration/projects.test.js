"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const http_status_codes_1 = require("http-status-codes");
const helpers_1 = require("./helpers");
(0, vitest_1.describe)('GET /api/v1/projects/dashboard', () => {
    (0, vitest_1.it)('returns dashboard data scoped to the user', async () => {
        const { session } = await (0, helpers_1.register)({ email: 'project-dashboard@example.com' });
        const { teamId } = await (0, helpers_1.createTeam)(session.accessToken);
        await (0, helpers_1.createProject)(session.accessToken, { teamId });
        const response = await (0, helpers_1.authRequest)('get', '/api/v1/projects/dashboard', session.accessToken);
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.OK);
        (0, vitest_1.expect)(response.body.success).toBe(true);
        (0, vitest_1.expect)(response.body.data.statusDistribution).toBeDefined();
    });
});
(0, vitest_1.describe)('GET /api/v1/projects', () => {
    (0, vitest_1.it)('lists projects owned by the user', async () => {
        const { session } = await (0, helpers_1.register)({ email: 'project-owner-list@example.com' });
        const { teamId } = await (0, helpers_1.createTeam)(session.accessToken);
        await (0, helpers_1.createProject)(session.accessToken, { teamId });
        const response = await (0, helpers_1.authRequest)('get', '/api/v1/projects', session.accessToken);
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.OK);
        (0, vitest_1.expect)(response.body.success).toBe(true);
        (0, vitest_1.expect)(response.body.data.length).toBeGreaterThanOrEqual(1);
    });
    (0, vitest_1.it)('allows admins to list any project', async () => {
        const { session: owner } = await (0, helpers_1.register)({ email: 'project-admin-list-owner@example.com' });
        const adminSession = await (0, helpers_1.createAdminUser)({ email: 'project-admin-list@example.com' });
        const { teamId } = await (0, helpers_1.createTeam)(owner.accessToken);
        await (0, helpers_1.createProject)(owner.accessToken, { teamId });
        const response = await (0, helpers_1.authRequest)('get', '/api/v1/projects', adminSession.accessToken);
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.OK);
        (0, vitest_1.expect)(response.body.data.length).toBeGreaterThanOrEqual(1);
    });
});
(0, vitest_1.describe)('GET /api/v1/projects/:id', () => {
    (0, vitest_1.it)('returns a project by id', async () => {
        const { session } = await (0, helpers_1.register)({ email: 'project-owner-get@example.com' });
        const { teamId } = await (0, helpers_1.createTeam)(session.accessToken);
        const { projectId } = await (0, helpers_1.createProject)(session.accessToken, { teamId });
        const response = await (0, helpers_1.authRequest)('get', `/api/v1/projects/${projectId}`, session.accessToken);
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.OK);
        (0, vitest_1.expect)(response.body.data.id).toBe(projectId);
    });
    (0, vitest_1.it)('returns 404 for unknown project', async () => {
        const { session } = await (0, helpers_1.register)({ email: 'project-owner-get-missing@example.com' });
        const response = await (0, helpers_1.authRequest)('get', '/api/v1/projects/000000000000000000000000', session.accessToken);
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.NOT_FOUND);
    });
});
(0, vitest_1.describe)('POST /api/v1/projects', () => {
    (0, vitest_1.it)('creates a project under a team', async () => {
        const { session } = await (0, helpers_1.register)({ email: 'project-owner-create@example.com' });
        const { teamId } = await (0, helpers_1.createTeam)(session.accessToken);
        const response = await (0, helpers_1.authRequest)('post', '/api/v1/projects', session.accessToken).send({
            name: 'New Project',
            description: 'A test project',
            teamId,
        });
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.CREATED);
        (0, vitest_1.expect)(response.body.data.name).toBe('New Project');
        (0, vitest_1.expect)(response.body.data.ownerId).toBe(session.userId);
        (0, vitest_1.expect)(response.body.data.teamId).toBe(teamId);
    });
    (0, vitest_1.it)('rejects missing teamId', async () => {
        const { session } = await (0, helpers_1.register)({ email: 'project-owner-create-invalid@example.com' });
        const response = await (0, helpers_1.authRequest)('post', '/api/v1/projects', session.accessToken).send({
            name: 'Orphan Project',
            description: 'No team',
        });
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.BAD_REQUEST);
    });
});
(0, vitest_1.describe)('PATCH /api/v1/projects/:id', () => {
    (0, vitest_1.it)('allows the owner to update the project', async () => {
        const { session } = await (0, helpers_1.register)({ email: 'project-owner-update@example.com' });
        const { teamId } = await (0, helpers_1.createTeam)(session.accessToken);
        const { projectId } = await (0, helpers_1.createProject)(session.accessToken, { teamId });
        const response = await (0, helpers_1.authRequest)('patch', `/api/v1/projects/${projectId}`, session.accessToken).send({
            name: 'Updated Project Name',
        });
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.OK);
        (0, vitest_1.expect)(response.body.data.name).toBe('Updated Project Name');
    });
    (0, vitest_1.it)('forbids non-owners from updating the project', async () => {
        const { session: owner } = await (0, helpers_1.register)({ email: 'project-owner-update-deny@example.com' });
        const { session: intruder } = await (0, helpers_1.register)({ email: 'project-intruder-update@example.com' });
        const { teamId } = await (0, helpers_1.createTeam)(owner.accessToken);
        const { projectId } = await (0, helpers_1.createProject)(owner.accessToken, { teamId });
        const response = await (0, helpers_1.authRequest)('patch', `/api/v1/projects/${projectId}`, intruder.accessToken).send({
            name: 'Hacked Project Name',
        });
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.FORBIDDEN);
    });
});
(0, vitest_1.describe)('DELETE /api/v1/projects/:id', () => {
    (0, vitest_1.it)('allows the owner to delete the project', async () => {
        const { session } = await (0, helpers_1.register)({ email: 'project-owner-delete@example.com' });
        const { teamId } = await (0, helpers_1.createTeam)(session.accessToken);
        const { projectId } = await (0, helpers_1.createProject)(session.accessToken, { teamId });
        const response = await (0, helpers_1.authRequest)('delete', `/api/v1/projects/${projectId}`, session.accessToken);
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.NO_CONTENT);
    });
    (0, vitest_1.it)('forbids non-owners from deleting the project', async () => {
        const { session: owner } = await (0, helpers_1.register)({ email: 'project-owner-delete-deny@example.com' });
        const { session: intruder } = await (0, helpers_1.register)({ email: 'project-intruder-delete@example.com' });
        const { teamId } = await (0, helpers_1.createTeam)(owner.accessToken);
        const { projectId } = await (0, helpers_1.createProject)(owner.accessToken, { teamId });
        const response = await (0, helpers_1.authRequest)('delete', `/api/v1/projects/${projectId}`, intruder.accessToken);
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.FORBIDDEN);
    });
});
//# sourceMappingURL=projects.test.js.map