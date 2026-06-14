import { describe, it, expect } from 'vitest';
import { StatusCodes } from 'http-status-codes';
import { api, register, createNotification, authRequest } from './helpers';

describe('GET /api/v1/notifications/dashboard', () => {
  it('returns notification dashboard for the user', async () => {
    const { session } = await register({ email: 'notification-dashboard@example.com' });
    await createNotification(session.accessToken, { userId: session.userId });

    const response = await authRequest(
      'get',
      '/api/v1/notifications/dashboard',
      session.accessToken
    );

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.data.unreadByType).toBeDefined();
  });
});

describe('GET /api/v1/notifications', () => {
  it('lists notifications for the authenticated user', async () => {
    const { session } = await register({ email: 'notification-list@example.com' });
    await createNotification(session.accessToken, { userId: session.userId });

    const response = await authRequest('get', '/api/v1/notifications', session.accessToken);

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.data.length).toBeGreaterThanOrEqual(1);
    expect(response.body.data[0].userId).toBe(session.userId);
  });

  it('filters unread notifications', async () => {
    const { session } = await register({ email: 'notification-filter@example.com' });
    await createNotification(session.accessToken, { userId: session.userId });

    const response = await authRequest('get', '/api/v1/notifications', session.accessToken).query({
      isRead: 'false',
    });

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.data.every((n: { isRead: boolean }) => !n.isRead)).toBe(true);
  });
});

describe('GET /api/v1/notifications/unread-count', () => {
  it('returns the unread count', async () => {
    const { session } = await register({ email: 'notification-count@example.com' });
    await createNotification(session.accessToken, { userId: session.userId });

    const response = await authRequest(
      'get',
      '/api/v1/notifications/unread-count',
      session.accessToken
    );

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.data.count).toBeGreaterThanOrEqual(1);
  });
});

describe('GET /api/v1/notifications/:id', () => {
  it('returns a notification owned by the user', async () => {
    const { session } = await register({ email: 'notification-get@example.com' });
    const { notificationId } = await createNotification(session.accessToken, {
      userId: session.userId,
    });

    const response = await authRequest(
      'get',
      `/api/v1/notifications/${notificationId}`,
      session.accessToken
    );

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.data.id).toBe(notificationId);
  });

  it('forbids accessing another users notification', async () => {
    const { session: owner } = await register({ email: 'notification-get-owner@example.com' });
    const { session: intruder } = await register({
      email: 'notification-get-intruder@example.com',
    });
    const { notificationId } = await createNotification(owner.accessToken, {
      userId: owner.userId,
    });

    const response = await authRequest(
      'get',
      `/api/v1/notifications/${notificationId}`,
      intruder.accessToken
    );

    expect(response.status).toBe(StatusCodes.FORBIDDEN);
  });
});

describe('POST /api/v1/notifications', () => {
  it('creates a notification for a user', async () => {
    const { session: creator } = await register({ email: 'notification-create@example.com' });
    const { session: target } = await register({ email: 'notification-target@example.com' });

    const response = await authRequest('post', '/api/v1/notifications', creator.accessToken).send({
      userId: target.userId,
      title: 'Hello',
      message: 'You have a new notification',
      type: 'mention',
      channels: ['in-app'],
    });

    expect(response.status).toBe(StatusCodes.CREATED);
    expect(response.body.data.userId).toBe(target.userId);
  });

  it('rejects invalid notification types', async () => {
    const { session } = await register({ email: 'notification-create-invalid@example.com' });

    const response = await authRequest('post', '/api/v1/notifications', session.accessToken).send({
      userId: session.userId,
      title: 'Bad',
      message: 'Type is invalid',
      type: 'unknown-type',
    });

    expect(response.status).toBe(StatusCodes.BAD_REQUEST);
  });
});

describe('PATCH /api/v1/notifications/:id/read', () => {
  it('marks a notification as read', async () => {
    const { session } = await register({ email: 'notification-read@example.com' });
    const { notificationId } = await createNotification(session.accessToken, {
      userId: session.userId,
    });

    const response = await authRequest(
      'patch',
      `/api/v1/notifications/${notificationId}/read`,
      session.accessToken
    );

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.data.isRead).toBe(true);
  });

  it('forbids marking another users notification as read', async () => {
    const { session: owner } = await register({ email: 'notification-read-owner@example.com' });
    const { session: intruder } = await register({
      email: 'notification-read-intruder@example.com',
    });
    const { notificationId } = await createNotification(owner.accessToken, {
      userId: owner.userId,
    });

    const response = await authRequest(
      'patch',
      `/api/v1/notifications/${notificationId}/read`,
      intruder.accessToken
    );

    expect(response.status).toBe(StatusCodes.NOT_FOUND);
  });
});

describe('PATCH /api/v1/notifications/read-all', () => {
  it('marks all notifications for the user as read', async () => {
    const { session } = await register({ email: 'notification-read-all@example.com' });
    await createNotification(session.accessToken, { userId: session.userId });
    await createNotification(session.accessToken, { userId: session.userId });

    const response = await authRequest(
      'patch',
      '/api/v1/notifications/read-all',
      session.accessToken
    );

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.data.count).toBeGreaterThanOrEqual(2);
  });
});

describe('DELETE /api/v1/notifications/:id', () => {
  it('allows the owner to delete the notification', async () => {
    const { session } = await register({ email: 'notification-delete@example.com' });
    const { notificationId } = await createNotification(session.accessToken, {
      userId: session.userId,
    });

    const response = await authRequest(
      'delete',
      `/api/v1/notifications/${notificationId}`,
      session.accessToken
    );

    expect(response.status).toBe(StatusCodes.NO_CONTENT);
  });

  it('forbids deleting another users notification', async () => {
    const { session: owner } = await register({ email: 'notification-delete-owner@example.com' });
    const { session: intruder } = await register({
      email: 'notification-delete-intruder@example.com',
    });
    const { notificationId } = await createNotification(owner.accessToken, {
      userId: owner.userId,
    });

    const response = await authRequest(
      'delete',
      `/api/v1/notifications/${notificationId}`,
      intruder.accessToken
    );

    expect(response.status).toBe(StatusCodes.FORBIDDEN);
  });
});
