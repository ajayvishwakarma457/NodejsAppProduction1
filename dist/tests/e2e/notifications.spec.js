"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const fixtures_1 = require("./fixtures");
test_1.test.describe('Notifications', () => {
    test_1.test.beforeEach(async () => {
        await (0, fixtures_1.cleanupDatabase)();
    });
    (0, test_1.test)('creates and marks a notification as read', async ({ request }) => {
        const creator = await (0, fixtures_1.registerUser)(request, `notification-creator@example.com`);
        const target = await (0, fixtures_1.registerUser)(request, `notification-target@example.com`);
        const notification = await (0, fixtures_1.createNotification)(request, creator.accessToken, target.id, 'E2E Mention');
        const unread = await request.get('/api/v1/notifications/unread-count', {
            headers: { Authorization: `Bearer ${target.accessToken}` },
        });
        (0, test_1.expect)(unread.ok()).toBeTruthy();
        (0, test_1.expect)((await unread.json()).data.count).toBeGreaterThanOrEqual(1);
        const read = await request.patch(`/api/v1/notifications/${notification.id}/read`, {
            headers: { Authorization: `Bearer ${target.accessToken}` },
        });
        (0, test_1.expect)(read.ok()).toBeTruthy();
        (0, test_1.expect)((await read.json()).data.isRead).toBe(true);
        const get = await request.get(`/api/v1/notifications/${notification.id}`, {
            headers: { Authorization: `Bearer ${target.accessToken}` },
        });
        (0, test_1.expect)(get.ok()).toBeTruthy();
        (0, test_1.expect)((await get.json()).data.isRead).toBe(true);
    });
    (0, test_1.test)('forbids accessing another users notification', async ({ request }) => {
        const owner = await (0, fixtures_1.registerUser)(request, `notification-owner@example.com`);
        const intruder = await (0, fixtures_1.registerUser)(request, `notification-intruder@example.com`);
        const notification = await (0, fixtures_1.createNotification)(request, owner.accessToken, owner.id);
        const response = await request.get(`/api/v1/notifications/${notification.id}`, {
            headers: { Authorization: `Bearer ${intruder.accessToken}` },
        });
        (0, test_1.expect)(response.status()).toBe(403);
    });
    (0, test_1.test)('lists notifications for the authenticated user', async ({ request }) => {
        const user = await (0, fixtures_1.registerUser)(request, `notification-list@example.com`);
        await (0, fixtures_1.createNotification)(request, user.accessToken, user.id);
        const response = await request.get('/api/v1/notifications', {
            headers: { Authorization: `Bearer ${user.accessToken}` },
        });
        (0, test_1.expect)(response.ok()).toBeTruthy();
        const body = await response.json();
        (0, test_1.expect)(body.data.length).toBeGreaterThanOrEqual(1);
        (0, test_1.expect)(body.data[0].userId).toBe(user.id);
    });
});
//# sourceMappingURL=notifications.spec.js.map