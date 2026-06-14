"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const http_status_codes_1 = require("http-status-codes");
const helpers_1 = require("./helpers");
(0, vitest_1.describe)('GET /api/v1/teams', () => {
    (0, vitest_1.it)('lists teams the user owns or belongs to', async () => {
        const { session } = await (0, helpers_1.register)({ email: 'team-owner-list@example.com' });
        await (0, helpers_1.createTeam)(session.accessToken);
        const response = await (0, helpers_1.authRequest)('get', '/api/v1/teams', session.accessToken);
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.OK);
        (0, vitest_1.expect)(response.body.success).toBe(true);
        (0, vitest_1.expect)(response.body.data.length).toBeGreaterThanOrEqual(1);
    });
    (0, vitest_1.it)('rejects unauthenticated access', async () => {
        const response = await helpers_1.api.get('/api/v1/teams');
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.UNAUTHORIZED);
    });
});
(0, vitest_1.describe)('GET /api/v1/teams/:id', () => {
    (0, vitest_1.it)('returns a team by id', async () => {
        const { session } = await (0, helpers_1.register)({ email: 'team-owner-get@example.com' });
        const { teamId } = await (0, helpers_1.createTeam)(session.accessToken);
        const response = await (0, helpers_1.authRequest)('get', `/api/v1/teams/${teamId}`, session.accessToken);
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.OK);
        (0, vitest_1.expect)(response.body.success).toBe(true);
        (0, vitest_1.expect)(response.body.data.id).toBe(teamId);
        (0, vitest_1.expect)(response.body.data.ownerId).toBe(session.userId);
    });
    (0, vitest_1.it)('returns 404 for unknown team', async () => {
        const { session } = await (0, helpers_1.register)({ email: 'team-owner-get-missing@example.com' });
        const response = await (0, helpers_1.authRequest)('get', '/api/v1/teams/000000000000000000000000', session.accessToken);
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.NOT_FOUND);
    });
});
(0, vitest_1.describe)('POST /api/v1/teams', () => {
    (0, vitest_1.it)('creates a team and sets the creator as owner', async () => {
        const { session } = await (0, helpers_1.register)({ email: 'team-owner-create@example.com' });
        const response = await (0, helpers_1.authRequest)('post', '/api/v1/teams', session.accessToken).send({
            name: 'New Team',
            description: 'A test team',
        });
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.CREATED);
        (0, vitest_1.expect)(response.body.success).toBe(true);
        (0, vitest_1.expect)(response.body.data.name).toBe('New Team');
        (0, vitest_1.expect)(response.body.data.ownerId).toBe(session.userId);
        (0, vitest_1.expect)(response.body.data.members.length).toBe(0);
    });
    (0, vitest_1.it)('rejects invalid payloads', async () => {
        const { session } = await (0, helpers_1.register)({ email: 'team-owner-create-invalid@example.com' });
        const response = await (0, helpers_1.authRequest)('post', '/api/v1/teams', session.accessToken).send({
            name: '',
        });
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.BAD_REQUEST);
    });
});
(0, vitest_1.describe)('PATCH /api/v1/teams/:id', () => {
    (0, vitest_1.it)('allows the owner to update the team', async () => {
        const { session } = await (0, helpers_1.register)({ email: 'team-owner-update@example.com' });
        const { teamId } = await (0, helpers_1.createTeam)(session.accessToken);
        const response = await (0, helpers_1.authRequest)('patch', `/api/v1/teams/${teamId}`, session.accessToken).send({
            name: 'Updated Team Name',
        });
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.OK);
        (0, vitest_1.expect)(response.body.success).toBe(true);
        (0, vitest_1.expect)(response.body.data.name).toBe('Updated Team Name');
    });
    (0, vitest_1.it)('forbids non-owners from updating the team', async () => {
        const { session: owner } = await (0, helpers_1.register)({ email: 'team-owner-update-deny@example.com' });
        const { session: member } = await (0, helpers_1.register)({ email: 'team-member-update-deny@example.com' });
        const { teamId } = await (0, helpers_1.createTeam)(owner.accessToken);
        const response = await (0, helpers_1.authRequest)('patch', `/api/v1/teams/${teamId}`, member.accessToken).send({
            name: 'Hacked Team Name',
        });
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.FORBIDDEN);
    });
});
(0, vitest_1.describe)('DELETE /api/v1/teams/:id', () => {
    (0, vitest_1.it)('allows the owner to delete the team', async () => {
        const { session } = await (0, helpers_1.register)({ email: 'team-owner-delete@example.com' });
        const { teamId } = await (0, helpers_1.createTeam)(session.accessToken);
        const response = await (0, helpers_1.authRequest)('delete', `/api/v1/teams/${teamId}`, session.accessToken);
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.NO_CONTENT);
    });
    (0, vitest_1.it)('forbids non-owners from deleting the team', async () => {
        const { session: owner } = await (0, helpers_1.register)({ email: 'team-owner-delete-deny@example.com' });
        const { session: member } = await (0, helpers_1.register)({ email: 'team-member-delete-deny@example.com' });
        const { teamId } = await (0, helpers_1.createTeam)(owner.accessToken);
        const response = await (0, helpers_1.authRequest)('delete', `/api/v1/teams/${teamId}`, member.accessToken);
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.FORBIDDEN);
    });
});
(0, vitest_1.describe)('POST /api/v1/teams/:id/members', () => {
    (0, vitest_1.it)('allows the owner to add a member', async () => {
        const { session: owner } = await (0, helpers_1.register)({ email: 'team-owner-add-member@example.com' });
        const { session: member } = await (0, helpers_1.register)({ email: 'team-member-added@example.com' });
        const { teamId } = await (0, helpers_1.createTeam)(owner.accessToken);
        const response = await (0, helpers_1.authRequest)('post', `/api/v1/teams/${teamId}/members`, owner.accessToken).send({
            userId: member.userId,
            role: 'member',
        });
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.OK);
        (0, vitest_1.expect)(response.body.success).toBe(true);
        (0, vitest_1.expect)(response.body.data.members.length).toBe(1);
        (0, vitest_1.expect)(response.body.data.members[0].userId).toBe(member.userId);
    });
    (0, vitest_1.it)('forbids non-owners from adding members', async () => {
        const { session: owner } = await (0, helpers_1.register)({ email: 'team-owner-add-deny@example.com' });
        const { session: member } = await (0, helpers_1.register)({ email: 'team-member-add-deny@example.com' });
        const { session: intruder } = await (0, helpers_1.register)({ email: 'team-intruder-add@example.com' });
        const { teamId } = await (0, helpers_1.createTeam)(owner.accessToken);
        await (0, helpers_1.authRequest)('post', `/api/v1/teams/${teamId}/members`, owner.accessToken).send({
            userId: member.userId,
            role: 'member',
        });
        const response = await (0, helpers_1.authRequest)('post', `/api/v1/teams/${teamId}/members`, intruder.accessToken).send({
            userId: intruder.userId,
            role: 'member',
        });
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.FORBIDDEN);
    });
});
(0, vitest_1.describe)('DELETE /api/v1/teams/:id/members', () => {
    (0, vitest_1.it)('allows the owner to remove a member', async () => {
        const { session: owner } = await (0, helpers_1.register)({ email: 'team-owner-remove-member@example.com' });
        const { session: member } = await (0, helpers_1.register)({ email: 'team-member-removed@example.com' });
        const { teamId } = await (0, helpers_1.createTeam)(owner.accessToken);
        await (0, helpers_1.authRequest)('post', `/api/v1/teams/${teamId}/members`, owner.accessToken).send({
            userId: member.userId,
            role: 'member',
        });
        const response = await (0, helpers_1.authRequest)('delete', `/api/v1/teams/${teamId}/members`, owner.accessToken).send({
            userId: member.userId,
        });
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.OK);
        (0, vitest_1.expect)(response.body.data.members.length).toBe(0);
    });
    (0, vitest_1.it)('forbids non-owners from removing members', async () => {
        const { session: owner } = await (0, helpers_1.register)({ email: 'team-owner-remove-deny@example.com' });
        const { session: member } = await (0, helpers_1.register)({ email: 'team-member-remove-deny@example.com' });
        const { teamId } = await (0, helpers_1.createTeam)(owner.accessToken);
        await (0, helpers_1.authRequest)('post', `/api/v1/teams/${teamId}/members`, owner.accessToken).send({
            userId: member.userId,
            role: 'member',
        });
        const response = await (0, helpers_1.authRequest)('delete', `/api/v1/teams/${teamId}/members`, member.accessToken).send({
            userId: member.userId,
        });
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.FORBIDDEN);
    });
});
//# sourceMappingURL=teams.test.js.map