import { describe, it, expect } from 'vitest';
import { StatusCodes } from 'http-status-codes';
import { api, register, login, authRequest } from './helpers';

describe('POST /api/v1/auth/register', () => {
  it('registers a new user and returns tokens', async () => {
    const { response } = await register({ email: 'new-user@example.com' });

    expect(response.status).toBe(StatusCodes.CREATED);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('User registered successfully');
    expect(response.body.data.user.email).toBe('new-user@example.com');
    expect(response.body.data.user.password).toBeUndefined();
    expect(response.body.data.tokens.accessToken).toBeDefined();
    expect(response.body.data.tokens.refreshToken).toBeDefined();
  });

  it('rejects duplicate email addresses', async () => {
    await register({ email: 'duplicate@example.com' });

    const response = await api.post('/api/v1/auth/register').send({
      firstName: 'Another',
      lastName: 'User',
      email: 'duplicate@example.com',
      password: 'Password123!',
    });

    expect(response.status).toBe(StatusCodes.CONFLICT);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toContain('Email already registered');
  });

  it('rejects invalid request payloads', async () => {
    const response = await api.post('/api/v1/auth/register').send({
      email: 'not-an-email',
      password: '123',
    });

    expect(response.status).toBe(StatusCodes.BAD_REQUEST);
    expect(response.body.success).toBe(false);
  });
});

describe('POST /api/v1/auth/login', () => {
  it('authenticates a registered user', async () => {
    const { session } = await register({ email: 'login@example.com' });

    const response = await api.post('/api/v1/auth/login').send({
      email: 'login@example.com',
      password: 'Password123!',
    });

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.id).toBe(session.userId);
    expect(response.body.data.tokens.accessToken).toBeDefined();
  });

  it('rejects invalid credentials', async () => {
    await register({ email: 'bad-login@example.com' });

    const response = await api.post('/api/v1/auth/login').send({
      email: 'bad-login@example.com',
      password: 'wrong-password',
    });

    expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
    expect(response.body.success).toBe(false);
  });

  it('rejects unknown email addresses', async () => {
    const response = await api.post('/api/v1/auth/login').send({
      email: 'unknown@example.com',
      password: 'Password123!',
    });

    expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
    expect(response.body.success).toBe(false);
  });
});

describe('GET /api/v1/auth/me', () => {
  it('returns the authenticated user profile', async () => {
    const { session } = await register({ email: 'me@example.com' });

    const response = await authRequest('get', '/api/v1/auth/me', session.accessToken);

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.success).toBe(true);
    expect(response.body.data.email).toBe('me@example.com');
    expect(response.body.data.id).toBe(session.userId);
  });

  it('rejects requests without a token', async () => {
    const response = await api.get('/api/v1/auth/me');

    expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
    expect(response.body.success).toBe(false);
  });

  it('rejects requests with an invalid token', async () => {
    const response = await api.get('/api/v1/auth/me').set('Authorization', 'Bearer invalid-token');

    expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
    expect(response.body.success).toBe(false);
  });
});

describe('POST /api/v1/auth/logout', () => {
  it('logs out an authenticated user', async () => {
    const { session } = await register({ email: 'logout@example.com' });

    const response = await authRequest('post', '/api/v1/auth/logout', session.accessToken).send({
      refreshToken: session.refreshToken,
    });

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.success).toBe(true);
  });

  it('rejects logout without an access token', async () => {
    const response = await api.post('/api/v1/auth/logout').send({});

    // authMiddleware runs before the controller and rejects unauthenticated requests.
    expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
    expect(response.body.success).toBe(false);
  });
});

describe('POST /api/v1/auth/refresh', () => {
  it('rotates a refresh token into a new token pair', async () => {
    const { session } = await register({ email: 'refresh@example.com' });

    const response = await api.post('/api/v1/auth/refresh').send({
      refreshToken: session.refreshToken,
    });

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.success).toBe(true);
    expect(response.body.data.accessToken).toBeDefined();
    expect(response.body.data.refreshToken).toBeDefined();
    expect(response.body.data.accessToken).not.toBe(session.accessToken);
  });

  it('rejects an invalid refresh token', async () => {
    const response = await api.post('/api/v1/auth/refresh').send({
      refreshToken: 'invalid-token',
    });

    expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
    expect(response.body.success).toBe(false);
  });
});

describe('PATCH /api/v1/auth/change-password', () => {
  it('changes the user password when the old password is correct', async () => {
    const { session } = await register({ email: 'change-password@example.com' });

    const response = await authRequest(
      'patch',
      '/api/v1/auth/change-password',
      session.accessToken
    ).send({
      oldPassword: 'Password123!',
      newPassword: 'NewPassword123!',
    });

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.success).toBe(true);

    const loginResponse = await api.post('/api/v1/auth/login').send({
      email: 'change-password@example.com',
      password: 'NewPassword123!',
    });

    expect(loginResponse.status).toBe(StatusCodes.OK);
  });

  it('rejects password change with incorrect old password', async () => {
    const { session } = await register({ email: 'bad-password@example.com' });

    const response = await authRequest(
      'patch',
      '/api/v1/auth/change-password',
      session.accessToken
    ).send({
      oldPassword: 'wrong-password',
      newPassword: 'NewPassword123!',
    });

    expect(response.status).toBe(StatusCodes.BAD_REQUEST);
    expect(response.body.success).toBe(false);
  });
});
