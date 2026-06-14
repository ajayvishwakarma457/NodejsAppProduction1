"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const http_status_codes_1 = require("http-status-codes");
const helpers_1 = require("./helpers");
(0, vitest_1.describe)('GET /api/v1/comments', () => {
    (0, vitest_1.it)('lists comments filtered by taskId', async () => {
        const { session } = await (0, helpers_1.register)({ email: 'comment-list@example.com' });
        const { teamId } = await (0, helpers_1.createTeam)(session.accessToken);
        const { projectId } = await (0, helpers_1.createProject)(session.accessToken, { teamId });
        const { taskId } = await (0, helpers_1.createTask)(session.accessToken, {
            projectId,
            assignedTo: session.userId,
        });
        await (0, helpers_1.createComment)(session.accessToken, { taskId });
        const response = await (0, helpers_1.authRequest)('get', '/api/v1/comments', session.accessToken).query({
            taskId,
        });
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.OK);
        (0, vitest_1.expect)(response.body.data.length).toBeGreaterThanOrEqual(1);
    });
});
(0, vitest_1.describe)('GET /api/v1/comments/:id', () => {
    (0, vitest_1.it)('returns a comment by id', async () => {
        const { session } = await (0, helpers_1.register)({ email: 'comment-get@example.com' });
        const { teamId } = await (0, helpers_1.createTeam)(session.accessToken);
        const { projectId } = await (0, helpers_1.createProject)(session.accessToken, { teamId });
        const { taskId } = await (0, helpers_1.createTask)(session.accessToken, {
            projectId,
            assignedTo: session.userId,
        });
        const { commentId } = await (0, helpers_1.createComment)(session.accessToken, { taskId });
        const response = await (0, helpers_1.authRequest)('get', `/api/v1/comments/${commentId}`, session.accessToken);
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.OK);
        (0, vitest_1.expect)(response.body.data.id).toBe(commentId);
    });
});
(0, vitest_1.describe)('POST /api/v1/comments', () => {
    (0, vitest_1.it)('creates a comment on a task', async () => {
        const { session } = await (0, helpers_1.register)({ email: 'comment-create@example.com' });
        const { teamId } = await (0, helpers_1.createTeam)(session.accessToken);
        const { projectId } = await (0, helpers_1.createProject)(session.accessToken, { teamId });
        const { taskId } = await (0, helpers_1.createTask)(session.accessToken, {
            projectId,
            assignedTo: session.userId,
        });
        const response = await (0, helpers_1.authRequest)('post', '/api/v1/comments', session.accessToken).send({
            taskId,
            content: 'This is a test comment',
        });
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.CREATED);
        (0, vitest_1.expect)(response.body.data.content).toBe('This is a test comment');
        (0, vitest_1.expect)(response.body.data.userId).toBe(session.userId);
    });
    (0, vitest_1.it)('rejects missing taskId', async () => {
        const { session } = await (0, helpers_1.register)({ email: 'comment-create-invalid@example.com' });
        const response = await (0, helpers_1.authRequest)('post', '/api/v1/comments', session.accessToken).send({
            content: 'No task id',
        });
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.BAD_REQUEST);
    });
});
(0, vitest_1.describe)('PATCH /api/v1/comments/:id', () => {
    (0, vitest_1.it)('allows the author to update the comment', async () => {
        const { session } = await (0, helpers_1.register)({ email: 'comment-update@example.com' });
        const { teamId } = await (0, helpers_1.createTeam)(session.accessToken);
        const { projectId } = await (0, helpers_1.createProject)(session.accessToken, { teamId });
        const { taskId } = await (0, helpers_1.createTask)(session.accessToken, {
            projectId,
            assignedTo: session.userId,
        });
        const { commentId } = await (0, helpers_1.createComment)(session.accessToken, { taskId });
        const response = await (0, helpers_1.authRequest)('patch', `/api/v1/comments/${commentId}`, session.accessToken).send({
            content: 'Updated comment content',
        });
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.OK);
        (0, vitest_1.expect)(response.body.data.content).toBe('Updated comment content');
    });
    (0, vitest_1.it)('forbids non-authors from updating the comment', async () => {
        const { session: author } = await (0, helpers_1.register)({ email: 'comment-update-deny@example.com' });
        const { session: intruder } = await (0, helpers_1.register)({ email: 'comment-intruder-update@example.com' });
        const { teamId } = await (0, helpers_1.createTeam)(author.accessToken);
        const { projectId } = await (0, helpers_1.createProject)(author.accessToken, { teamId });
        const { taskId } = await (0, helpers_1.createTask)(author.accessToken, {
            projectId,
            assignedTo: author.userId,
        });
        const { commentId } = await (0, helpers_1.createComment)(author.accessToken, { taskId });
        const response = await (0, helpers_1.authRequest)('patch', `/api/v1/comments/${commentId}`, intruder.accessToken).send({
            content: 'Hacked comment',
        });
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.FORBIDDEN);
    });
});
(0, vitest_1.describe)('DELETE /api/v1/comments/:id', () => {
    (0, vitest_1.it)('allows the author to delete the comment', async () => {
        const { session } = await (0, helpers_1.register)({ email: 'comment-delete@example.com' });
        const { teamId } = await (0, helpers_1.createTeam)(session.accessToken);
        const { projectId } = await (0, helpers_1.createProject)(session.accessToken, { teamId });
        const { taskId } = await (0, helpers_1.createTask)(session.accessToken, {
            projectId,
            assignedTo: session.userId,
        });
        const { commentId } = await (0, helpers_1.createComment)(session.accessToken, { taskId });
        const response = await (0, helpers_1.authRequest)('delete', `/api/v1/comments/${commentId}`, session.accessToken);
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.NO_CONTENT);
    });
    (0, vitest_1.it)('forbids non-authors from deleting the comment', async () => {
        const { session: author } = await (0, helpers_1.register)({ email: 'comment-delete-deny@example.com' });
        const { session: intruder } = await (0, helpers_1.register)({ email: 'comment-intruder-delete@example.com' });
        const { teamId } = await (0, helpers_1.createTeam)(author.accessToken);
        const { projectId } = await (0, helpers_1.createProject)(author.accessToken, { teamId });
        const { taskId } = await (0, helpers_1.createTask)(author.accessToken, {
            projectId,
            assignedTo: author.userId,
        });
        const { commentId } = await (0, helpers_1.createComment)(author.accessToken, { taskId });
        const response = await (0, helpers_1.authRequest)('delete', `/api/v1/comments/${commentId}`, intruder.accessToken);
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.FORBIDDEN);
    });
});
//# sourceMappingURL=comments.test.js.map