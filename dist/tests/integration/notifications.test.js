"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const http_status_codes_1 = require("http-status-codes");
const helpers_1 = require("./helpers");
(0, vitest_1.describe)('GET /api/v1/notifications/dashboard', () => {
    (0, vitest_1.it)('returns notification dashboard for the user', async () => {
        const { session } = await (0, helpers_1.register)({ email: 'notification-dashboard@example.com' });
        await (0, helpers_1.createNotification)(session.accessToken, { userId: session.userId });
        const response = await (0, helpers_1.authRequest)('get', '/api/v1/notifications/dashboard', session.accessToken);
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.OK);
        (0, vitest_1.expect)(response.body.data.unreadByType).toBeDefined();
    });
});
(0, vitest_1.describe)('GET /api/v1/notifications', () => {
    (0, vitest_1.it)('lists notifications for the authenticated user', async () => {
        const { session } = await (0, helpers_1.register)({ email: 'notification-list@example.com' });
        await (0, helpers_1.createNotification)(session.accessToken, { userId: session.userId });
        const response = await (0, helpers_1.authRequest)('get', '/api/v1/notifications', session.accessToken);
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.OK);
        (0, vitest_1.expect)(response.body.data.length).toBeGreaterThanOrEqual(1);
        (0, vitest_1.expect)(response.body.data[0].userId).toBe(session.userId);
    });
    (0, vitest_1.it)('filters unread notifications', async () => {
        const { session } = await (0, helpers_1.register)({ email: 'notification-filter@example.com' });
        await (0, helpers_1.createNotification)(session.accessToken, { userId: session.userId });
        const response = await (0, helpers_1.authRequest)('get', '/api/v1/notifications', session.accessToken).query({
            isRead: 'false',
        });
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.OK);
        (0, vitest_1.expect)(response.body.data.every((n) => !n.isRead)).toBe(true);
    });
});
(0, vitest_1.describe)('GET /api/v1/notifications/unread-count', () => {
    (0, vitest_1.it)('returns the unread count', async () => {
        const { session } = await (0, helpers_1.register)({ email: 'notification-count@example.com' });
        await (0, helpers_1.createNotification)(session.accessToken, { userId: session.userId });
        const response = await (0, helpers_1.authRequest)('get', '/api/v1/notifications/unread-count', session.accessToken);
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.OK);
        (0, vitest_1.expect)(response.body.data.count).toBeGreaterThanOrEqual(1);
    });
});
(0, vitest_1.describe)('GET /api/v1/notifications/:id', () => {
    (0, vitest_1.it)('returns a notification owned by the user', async () => {
        const { session } = await (0, helpers_1.register)({ email: 'notification-get@example.com' });
        const { notificationId } = await (0, helpers_1.createNotification)(session.accessToken, {
            userId: session.userId,
        });
        const response = await (0, helpers_1.authRequest)('get', `/api/v1/notifications/${notificationId}`, session.accessToken);
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.OK);
        (0, vitest_1.expect)(response.body.data.id).toBe(notificationId);
    });
    (0, vitest_1.it)('forbids accessing another users notification', async () => {
        const { session: owner } = await (0, helpers_1.register)({ email: 'notification-get-owner@example.com' });
        const { session: intruder } = await (0, helpers_1.register)({
            email: 'notification-get-intruder@example.com',
        });
        const { notificationId } = await (0, helpers_1.createNotification)(owner.accessToken, {
            userId: owner.userId,
        });
        const response = await (0, helpers_1.authRequest)('get', `/api/v1/notifications/${notificationId}`, intruder.accessToken);
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.FORBIDDEN);
    });
});
(0, vitest_1.describe)('POST /api/v1/notifications', () => {
    (0, vitest_1.it)('creates a notification for a user', async () => {
        const { session: creator } = await (0, helpers_1.register)({ email: 'notification-create@example.com' });
        const { session: target } = await (0, helpers_1.register)({ email: 'notification-target@example.com' });
        const response = await (0, helpers_1.authRequest)('post', '/api/v1/notifications', creator.accessToken).send({
            userId: target.userId,
            title: 'Hello',
            message: 'You have a new notification',
            type: 'mention',
            channels: ['in-app'],
        });
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.CREATED);
        (0, vitest_1.expect)(response.body.data.userId).toBe(target.userId);
    });
    (0, vitest_1.it)('rejects invalid notification types', async () => {
        const { session } = await (0, helpers_1.register)({ email: 'notification-create-invalid@example.com' });
        const response = await (0, helpers_1.authRequest)('post', '/api/v1/notifications', session.accessToken).send({
            userId: session.userId,
            title: 'Bad',
            message: 'Type is invalid',
            type: 'unknown-type',
        });
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.BAD_REQUEST);
    });
});
(0, vitest_1.describe)('PATCH /api/v1/notifications/:id/read', () => {
    (0, vitest_1.it)('marks a notification as read', async () => {
        const { session } = await (0, helpers_1.register)({ email: 'notification-read@example.com' });
        const { notificationId } = await (0, helpers_1.createNotification)(session.accessToken, {
            userId: session.userId,
        });
        const response = await (0, helpers_1.authRequest)('patch', `/api/v1/notifications/${notificationId}/read`, session.accessToken);
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.OK);
        (0, vitest_1.expect)(response.body.data.isRead).toBe(true);
    });
    (0, vitest_1.it)('forbids marking another users notification as read', async () => {
        const { session: owner } = await (0, helpers_1.register)({ email: 'notification-read-owner@example.com' });
        const { session: intruder } = await (0, helpers_1.register)({
            email: 'notification-read-intruder@example.com',
        });
        const { notificationId } = await (0, helpers_1.createNotification)(owner.accessToken, {
            userId: owner.userId,
        });
        const response = await (0, helpers_1.authRequest)('patch', `/api/v1/notifications/${notificationId}/read`, intruder.accessToken);
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.NOT_FOUND);
    });
});
(0, vitest_1.describe)('PATCH /api/v1/notifications/read-all', () => {
    (0, vitest_1.it)('marks all notifications for the user as read', async () => {
        const { session } = await (0, helpers_1.register)({ email: 'notification-read-all@example.com' });
        await (0, helpers_1.createNotification)(session.accessToken, { userId: session.userId });
        await (0, helpers_1.createNotification)(session.accessToken, { userId: session.userId });
        const response = await (0, helpers_1.authRequest)('patch', '/api/v1/notifications/read-all', session.accessToken);
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.OK);
        (0, vitest_1.expect)(response.body.data.count).toBeGreaterThanOrEqual(2);
    });
});
(0, vitest_1.describe)('DELETE /api/v1/notifications/:id', () => {
    (0, vitest_1.it)('allows the owner to delete the notification', async () => {
        const { session } = await (0, helpers_1.register)({ email: 'notification-delete@example.com' });
        const { notificationId } = await (0, helpers_1.createNotification)(session.accessToken, {
            userId: session.userId,
        });
        const response = await (0, helpers_1.authRequest)('delete', `/api/v1/notifications/${notificationId}`, session.accessToken);
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.NO_CONTENT);
    });
    (0, vitest_1.it)('forbids deleting another users notification', async () => {
        const { session: owner } = await (0, helpers_1.register)({ email: 'notification-delete-owner@example.com' });
        const { session: intruder } = await (0, helpers_1.register)({
            email: 'notification-delete-intruder@example.com',
        });
        const { notificationId } = await (0, helpers_1.createNotification)(owner.accessToken, {
            userId: owner.userId,
        });
        const response = await (0, helpers_1.authRequest)('delete', `/api/v1/notifications/${notificationId}`, intruder.accessToken);
        (0, vitest_1.expect)(response.status).toBe(http_status_codes_1.StatusCodes.FORBIDDEN);
    });
});
//# sourceMappingURL=notifications.test.js.map