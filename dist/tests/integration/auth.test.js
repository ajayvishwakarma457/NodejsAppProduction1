"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const http_status_codes_1 = require("http-status-codes");
const helpers_1 = require("./helpers");
(0, vitest_1.describe)('POST /api/v1/auth/register', () => {
    (0, vitest_1.it)('registers a new user and returns tokens', async () => {
        const { response } = await (0, helpers_1.register)({ email: 'new-user@example.com' });
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.CREATED);
        (0, vitest_1.expect)(response.body.success).toBe(true);
        (0, vitest_1.expect)(response.body.message).toBe('User registered successfully');
        (0, vitest_1.expect)(response.body.data.user.email).toBe('new-user@example.com');
        (0, vitest_1.expect)(response.body.data.user.password).toBeUndefined();
        (0, vitest_1.expect)(response.body.data.tokens.accessToken).toBeDefined();
        (0, vitest_1.expect)(response.body.data.tokens.refreshToken).toBeDefined();
    });
    (0, vitest_1.it)('rejects duplicate email addresses', async () => {
        await (0, helpers_1.register)({ email: 'duplicate@example.com' });
        const response = await helpers_1.api.post('/api/v1/auth/register').send({
            firstName: 'Another',
            lastName: 'User',
            email: 'duplicate@example.com',
            password: 'Password123!',
        });
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.CONFLICT);
        (0, vitest_1.expect)(response.body.success).toBe(false);
        (0, vitest_1.expect)(response.body.message).toContain('Email already registered');
    });
    (0, vitest_1.it)('rejects invalid request payloads', async () => {
        const response = await helpers_1.api.post('/api/v1/auth/register').send({
            email: 'not-an-email',
            password: '123',
        });
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.BAD_REQUEST);
        (0, vitest_1.expect)(response.body.success).toBe(false);
    });
});
(0, vitest_1.describe)('POST /api/v1/auth/login', () => {
    (0, vitest_1.it)('authenticates a registered user', async () => {
        const { session } = await (0, helpers_1.register)({ email: 'login@example.com' });
        const response = await helpers_1.api.post('/api/v1/auth/login').send({
            email: 'login@example.com',
            password: 'Password123!',
        });
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.OK);
        (0, vitest_1.expect)(response.body.success).toBe(true);
        (0, vitest_1.expect)(response.body.data.user.id).toBe(session.userId);
        (0, vitest_1.expect)(response.body.data.tokens.accessToken).toBeDefined();
    });
    (0, vitest_1.it)('rejects invalid credentials', async () => {
        await (0, helpers_1.register)({ email: 'bad-login@example.com' });
        const response = await helpers_1.api.post('/api/v1/auth/login').send({
            email: 'bad-login@example.com',
            password: 'wrong-password',
        });
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.UNAUTHORIZED);
        (0, vitest_1.expect)(response.body.success).toBe(false);
    });
    (0, vitest_1.it)('rejects unknown email addresses', async () => {
        const response = await helpers_1.api.post('/api/v1/auth/login').send({
            email: 'unknown@example.com',
            password: 'Password123!',
        });
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.UNAUTHORIZED);
        (0, vitest_1.expect)(response.body.success).toBe(false);
    });
});
(0, vitest_1.describe)('GET /api/v1/auth/me', () => {
    (0, vitest_1.it)('returns the authenticated user profile', async () => {
        const { session } = await (0, helpers_1.register)({ email: 'me@example.com' });
        const response = await (0, helpers_1.authRequest)('get', '/api/v1/auth/me', session.accessToken);
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.OK);
        (0, vitest_1.expect)(response.body.success).toBe(true);
        (0, vitest_1.expect)(response.body.data.email).toBe('me@example.com');
        (0, vitest_1.expect)(response.body.data.id).toBe(session.userId);
    });
    (0, vitest_1.it)('rejects requests without a token', async () => {
        const response = await helpers_1.api.get('/api/v1/auth/me');
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.UNAUTHORIZED);
        (0, vitest_1.expect)(response.body.success).toBe(false);
    });
    (0, vitest_1.it)('rejects requests with an invalid token', async () => {
        const response = await helpers_1.api.get('/api/v1/auth/me').set('Authorization', 'Bearer invalid-token');
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.UNAUTHORIZED);
        (0, vitest_1.expect)(response.body.success).toBe(false);
    });
});
(0, vitest_1.describe)('POST /api/v1/auth/logout', () => {
    (0, vitest_1.it)('logs out an authenticated user', async () => {
        const { session } = await (0, helpers_1.register)({ email: 'logout@example.com' });
        const response = await (0, helpers_1.authRequest)('post', '/api/v1/auth/logout', session.accessToken).send({
            refreshToken: session.refreshToken,
        });
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.OK);
        (0, vitest_1.expect)(response.body.success).toBe(true);
    });
    (0, vitest_1.it)('rejects logout without an access token', async () => {
        const response = await helpers_1.api.post('/api/v1/auth/logout').send({});
        // authMiddleware runs before the controller and rejects unauthenticated requests.
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.UNAUTHORIZED);
        (0, vitest_1.expect)(response.body.success).toBe(false);
    });
});
(0, vitest_1.describe)('POST /api/v1/auth/refresh', () => {
    (0, vitest_1.it)('rotates a refresh token into a new token pair', async () => {
        const { session } = await (0, helpers_1.register)({ email: 'refresh@example.com' });
        const response = await helpers_1.api.post('/api/v1/auth/refresh').send({
            refreshToken: session.refreshToken,
        });
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.OK);
        (0, vitest_1.expect)(response.body.success).toBe(true);
        (0, vitest_1.expect)(response.body.data.accessToken).toBeDefined();
        (0, vitest_1.expect)(response.body.data.refreshToken).toBeDefined();
        (0, vitest_1.expect)(response.body.data.accessToken).not.toBe(session.accessToken);
    });
    (0, vitest_1.it)('rejects an invalid refresh token', async () => {
        const response = await helpers_1.api.post('/api/v1/auth/refresh').send({
            refreshToken: 'invalid-token',
        });
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.UNAUTHORIZED);
        (0, vitest_1.expect)(response.body.success).toBe(false);
    });
});
(0, vitest_1.describe)('PATCH /api/v1/auth/change-password', () => {
    (0, vitest_1.it)('changes the user password when the old password is correct', async () => {
        const { session } = await (0, helpers_1.register)({ email: 'change-password@example.com' });
        const response = await (0, helpers_1.authRequest)('patch', '/api/v1/auth/change-password', session.accessToken).send({
            oldPassword: 'Password123!',
            newPassword: 'NewPassword123!',
        });
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.OK);
        (0, vitest_1.expect)(response.body.success).toBe(true);
        const loginResponse = await helpers_1.api.post('/api/v1/auth/login').send({
            email: 'change-password@example.com',
            password: 'NewPassword123!',
        });
        (0, vitest_1.expect)(loginResponse.status).toBe(http_status_codes_1.StatusCodes.OK);
    });
    (0, vitest_1.it)('rejects password change with incorrect old password', async () => {
        const { session } = await (0, helpers_1.register)({ email: 'bad-password@example.com' });
        const response = await (0, helpers_1.authRequest)('patch', '/api/v1/auth/change-password', session.accessToken).send({
            oldPassword: 'wrong-password',
            newPassword: 'NewPassword123!',
        });
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.BAD_REQUEST);
        (0, vitest_1.expect)(response.body.success).toBe(false);
    });
});
//# sourceMappingURL=auth.test.js.map