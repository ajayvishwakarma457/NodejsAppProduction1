import { test, expect } from '@playwright/test';
import { cleanupDatabase, registerUser, createNotification } from './fixtures';

test.describe('Notifications', () => {
  test.beforeEach(async () => {
    await cleanupDatabase();
  });

  test('creates and marks a notification as read', async ({ request }) => {
    const creator = await registerUser(request, `notification-creator@example.com`);
    const target = await registerUser(request, `notification-target@example.com`);

    const notification = await createNotification(
      request,
      creator.accessToken,
      target.id,
      'E2E Mention'
    );

    const unread = await request.get('/api/v1/notifications/unread-count', {
      headers: { Authorization: `Bearer ${target.accessToken}` },
    });
    expect(unread.ok()).toBeTruthy();
    expect((await unread.json()).data.count).toBeGreaterThanOrEqual(1);

    const read = await request.patch(`/api/v1/notifications/${notification.id}/read`, {
      headers: { Authorization: `Bearer ${target.accessToken}` },
    });
    expect(read.ok()).toBeTruthy();
    expect((await read.json()).data.isRead).toBe(true);

    const get = await request.get(`/api/v1/notifications/${notification.id}`, {
      headers: { Authorization: `Bearer ${target.accessToken}` },
    });
    expect(get.ok()).toBeTruthy();
    expect((await get.json()).data.isRead).toBe(true);
  });

  test('forbids accessing another users notification', async ({ request }) => {
    const owner = await registerUser(request, `notification-owner@example.com`);
    const intruder = await registerUser(request, `notification-intruder@example.com`);
    const notification = await createNotification(request, owner.accessToken, owner.id);

    const response = await request.get(`/api/v1/notifications/${notification.id}`, {
      headers: { Authorization: `Bearer ${intruder.accessToken}` },
    });

    expect(response.status()).toBe(403);
  });

  test('lists notifications for the authenticated user', async ({ request }) => {
    const user = await registerUser(request, `notification-list@example.com`);
    await createNotification(request, user.accessToken, user.id);

    const response = await request.get('/api/v1/notifications', {
      headers: { Authorization: `Bearer ${user.accessToken}` },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.data[0].userId).toBe(user.id);
  });
});
