"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const http_status_codes_1 = require("http-status-codes");
const helpers_1 = require("./helpers");
(0, vitest_1.describe)('GET /api/v1/users', () => {
    (0, vitest_1.it)('lists users with pagination for admins', async () => {
        const adminSession = await (0, helpers_1.createAdminUser)({ email: 'admin-list@example.com' });
        await (0, helpers_1.register)({ email: 'member-list@example.com' });
        const response = await (0, helpers_1.authRequest)('get', '/api/v1/users', adminSession.accessToken).query({
            page: 1,
            limit: 10,
        });
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.OK);
        (0, vitest_1.expect)(response.body.success).toBe(true);
        (0, vitest_1.expect)(response.body.data.length).toBeGreaterThanOrEqual(2);
        (0, vitest_1.expect)(response.body.meta.page).toBe(1);
        (0, vitest_1.expect)(response.body.meta.total).toBeGreaterThanOrEqual(2);
    });
    (0, vitest_1.it)('rejects non-admin access', async () => {
        const { session } = await (0, helpers_1.register)({ email: 'member-list-deny@example.com' });
        const response = await (0, helpers_1.authRequest)('get', '/api/v1/users', session.accessToken);
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.FORBIDDEN);
        (0, vitest_1.expect)(response.body.success).toBe(false);
    });
    (0, vitest_1.it)('rejects unauthenticated access', async () => {
        const response = await helpers_1.api.get('/api/v1/users');
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.UNAUTHORIZED);
        (0, vitest_1.expect)(response.body.success).toBe(false);
    });
});
(0, vitest_1.describe)('GET /api/v1/users/:id', () => {
    (0, vitest_1.it)('allows admins to retrieve any user', async () => {
        const adminSession = await (0, helpers_1.createAdminUser)({ email: 'admin-get@example.com' });
        const { session: memberSession } = await (0, helpers_1.register)({ email: 'member-get@example.com' });
        const response = await (0, helpers_1.authRequest)('get', `/api/v1/users/${memberSession.userId}`, adminSession.accessToken);
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.OK);
        (0, vitest_1.expect)(response.body.success).toBe(true);
        (0, vitest_1.expect)(response.body.data.id).toBe(memberSession.userId);
    });
    (0, vitest_1.it)('allows users to retrieve their own profile', async () => {
        const { session } = await (0, helpers_1.register)({ email: 'member-self@example.com' });
        const response = await (0, helpers_1.authRequest)('get', `/api/v1/users/${session.userId}`, session.accessToken);
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.OK);
        (0, vitest_1.expect)(response.body.success).toBe(true);
        (0, vitest_1.expect)(response.body.data.id).toBe(session.userId);
    });
    (0, vitest_1.it)('forbids users from retrieving other profiles', async () => {
        const { session: memberOne } = await (0, helpers_1.register)({ email: 'member-one@example.com' });
        const { session: memberTwo } = await (0, helpers_1.register)({ email: 'member-two@example.com' });
        const response = await (0, helpers_1.authRequest)('get', `/api/v1/users/${memberTwo.userId}`, memberOne.accessToken);
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.FORBIDDEN);
        (0, vitest_1.expect)(response.body.success).toBe(false);
    });
});
(0, vitest_1.describe)('POST /api/v1/users', () => {
    (0, vitest_1.it)('allows admins to create users', async () => {
        const adminSession = await (0, helpers_1.createAdminUser)({ email: 'admin-create@example.com' });
        const response = await (0, helpers_1.authRequest)('post', '/api/v1/users', adminSession.accessToken).send({
            firstName: 'Created',
            lastName: 'User',
            email: 'created-user@example.com',
            password: 'Password123!',
            role: 'member',
        });
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.CREATED);
        (0, vitest_1.expect)(response.body.success).toBe(true);
        (0, vitest_1.expect)(response.body.data.email).toBe('created-user@example.com');
    });
    (0, vitest_1.it)('rejects non-admin user creation', async () => {
        const { session } = await (0, helpers_1.register)({ email: 'member-create@example.com' });
        const response = await (0, helpers_1.authRequest)('post', '/api/v1/users', session.accessToken).send({
            firstName: 'Created',
            lastName: 'User',
            email: 'created-by-member@example.com',
            password: 'Password123!',
        });
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.FORBIDDEN);
        (0, vitest_1.expect)(response.body.success).toBe(false);
    });
});
(0, vitest_1.describe)('PATCH /api/v1/users/:id', () => {
    (0, vitest_1.it)('allows admins to update any user', async () => {
        const adminSession = await (0, helpers_1.createAdminUser)({ email: 'admin-update@example.com' });
        const { session: memberSession } = await (0, helpers_1.register)({ email: 'member-update@example.com' });
        const response = await (0, helpers_1.authRequest)('patch', `/api/v1/users/${memberSession.userId}`, adminSession.accessToken).send({
            firstName: 'UpdatedByAdmin',
            role: 'manager',
        });
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.OK);
        (0, vitest_1.expect)(response.body.success).toBe(true);
        (0, vitest_1.expect)(response.body.data.firstName).toBe('UpdatedByAdmin');
        (0, vitest_1.expect)(response.body.data.role).toBe('manager');
    });
    (0, vitest_1.it)('allows users to update their own profile but not their role', async () => {
        const { session } = await (0, helpers_1.register)({ email: 'member-self-update@example.com' });
        const response = await (0, helpers_1.authRequest)('patch', `/api/v1/users/${session.userId}`, session.accessToken).send({
            firstName: 'UpdatedBySelf',
            role: 'admin',
        });
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.OK);
        (0, vitest_1.expect)(response.body.success).toBe(true);
        (0, vitest_1.expect)(response.body.data.firstName).toBe('UpdatedBySelf');
        (0, vitest_1.expect)(response.body.data.role).toBe('member');
    });
});
(0, vitest_1.describe)('DELETE /api/v1/users/:id', () => {
    (0, vitest_1.it)('allows admins to delete users', async () => {
        const adminSession = await (0, helpers_1.createAdminUser)({ email: 'admin-delete@example.com' });
        const { session: memberSession } = await (0, helpers_1.register)({ email: 'member-delete@example.com' });
        const response = await (0, helpers_1.authRequest)('delete', `/api/v1/users/${memberSession.userId}`, adminSession.accessToken);
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.NO_CONTENT);
    });
    (0, vitest_1.it)('rejects non-admin deletion', async () => {
        const { session } = await (0, helpers_1.register)({ email: 'member-delete-deny@example.com' });
        const { session: otherSession } = await (0, helpers_1.register)({ email: 'other-delete@example.com' });
        const response = await (0, helpers_1.authRequest)('delete', `/api/v1/users/${otherSession.userId}`, session.accessToken);
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.FORBIDDEN);
        (0, vitest_1.expect)(response.body.success).toBe(false);
    });
});
//# sourceMappingURL=users.test.js.map