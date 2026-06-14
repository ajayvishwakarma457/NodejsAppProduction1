import { describe, it, expect } from 'vitest';
import { StatusCodes } from 'http-status-codes';
import { api, register, createAdminUser, authRequest } from './helpers';

describe('GET /api/v1/users', () => {
  it('lists users with pagination for admins', async () => {
    const adminSession = await createAdminUser({ email: 'admin-list@example.com' });
    await register({ email: 'member-list@example.com' });

    const response = await authRequest('get', '/api/v1/users', adminSession.accessToken).query({
      page: 1,
      limit: 10,
    });

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.success).toBe(true);
    expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    expect(response.body.meta.page).toBe(1);
    expect(response.body.meta.total).toBeGreaterThanOrEqual(2);
  });

  it('rejects non-admin access', async () => {
    const { session } = await register({ email: 'member-list-deny@example.com' });

    const response = await authRequest('get', '/api/v1/users', session.accessToken);

    expect(response.status).toBe(StatusCodes.FORBIDDEN);
    expect(response.body.success).toBe(false);
  });

  it('rejects unauthenticated access', async () => {
    const response = await api.get('/api/v1/users');

    expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
    expect(response.body.success).toBe(false);
  });
});

describe('GET /api/v1/users/:id', () => {
  it('allows admins to retrieve any user', async () => {
    const adminSession = await createAdminUser({ email: 'admin-get@example.com' });
    const { session: memberSession } = await register({ email: 'member-get@example.com' });

    const response = await authRequest(
      'get',
      `/api/v1/users/${memberSession.userId}`,
      adminSession.accessToken
    );

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe(memberSession.userId);
  });

  it('allows users to retrieve their own profile', async () => {
    const { session } = await register({ email: 'member-self@example.com' });

    const response = await authRequest(
      'get',
      `/api/v1/users/${session.userId}`,
      session.accessToken
    );

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe(session.userId);
  });

  it('forbids users from retrieving other profiles', async () => {
    const { session: memberOne } = await register({ email: 'member-one@example.com' });
    const { session: memberTwo } = await register({ email: 'member-two@example.com' });

    const response = await authRequest(
      'get',
      `/api/v1/users/${memberTwo.userId}`,
      memberOne.accessToken
    );

    expect(response.status).toBe(StatusCodes.FORBIDDEN);
    expect(response.body.success).toBe(false);
  });
});

describe('POST /api/v1/users', () => {
  it('allows admins to create users', async () => {
    const adminSession = await createAdminUser({ email: 'admin-create@example.com' });

    const response = await authRequest('post', '/api/v1/users', adminSession.accessToken).send({
      firstName: 'Created',
      lastName: 'User',
      email: 'created-user@example.com',
      password: 'Password123!',
      role: 'member',
    });

    expect(response.status).toBe(StatusCodes.CREATED);
    expect(response.body.success).toBe(true);
    expect(response.body.data.email).toBe('created-user@example.com');
  });

  it('rejects non-admin user creation', async () => {
    const { session } = await register({ email: 'member-create@example.com' });

    const response = await authRequest('post', '/api/v1/users', session.accessToken).send({
      firstName: 'Created',
      lastName: 'User',
      email: 'created-by-member@example.com',
      password: 'Password123!',
    });

    expect(response.status).toBe(StatusCodes.FORBIDDEN);
    expect(response.body.success).toBe(false);
  });
});

describe('PATCH /api/v1/users/:id', () => {
  it('allows admins to update any user', async () => {
    const adminSession = await createAdminUser({ email: 'admin-update@example.com' });
    const { session: memberSession } = await register({ email: 'member-update@example.com' });

    const response = await authRequest(
      'patch',
      `/api/v1/users/${memberSession.userId}`,
      adminSession.accessToken
    ).send({
      firstName: 'UpdatedByAdmin',
      role: 'manager',
    });

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.success).toBe(true);
    expect(response.body.data.firstName).toBe('UpdatedByAdmin');
    expect(response.body.data.role).toBe('manager');
  });

  it('allows users to update their own profile but not their role', async () => {
    const { session } = await register({ email: 'member-self-update@example.com' });

    const response = await authRequest(
      'patch',
      `/api/v1/users/${session.userId}`,
      session.accessToken
    ).send({
      firstName: 'UpdatedBySelf',
      role: 'admin',
    });

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.success).toBe(true);
    expect(response.body.data.firstName).toBe('UpdatedBySelf');
    expect(response.body.data.role).toBe('member');
  });
});

describe('DELETE /api/v1/users/:id', () => {
  it('allows admins to delete users', async () => {
    const adminSession = await createAdminUser({ email: 'admin-delete@example.com' });
    const { session: memberSession } = await register({ email: 'member-delete@example.com' });

    const response = await authRequest(
      'delete',
      `/api/v1/users/${memberSession.userId}`,
      adminSession.accessToken
    );

    expect(response.status).toBe(StatusCodes.NO_CONTENT);
  });

  it('rejects non-admin deletion', async () => {
    const { session } = await register({ email: 'member-delete-deny@example.com' });
    const { session: otherSession } = await register({ email: 'other-delete@example.com' });

    const response = await authRequest(
      'delete',
      `/api/v1/users/${otherSession.userId}`,
      session.accessToken
    );

    expect(response.status).toBe(StatusCodes.FORBIDDEN);
    expect(response.body.success).toBe(false);
  });
});
