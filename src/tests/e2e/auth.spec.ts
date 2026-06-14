import { test, expect } from '@playwright/test';
import { cleanupDatabase, registerUser, loginUser } from './fixtures';

test.describe('Authentication', () => {
  test.beforeEach(async () => {
    await cleanupDatabase();
  });

  test('registers a new user and logs in', async ({ request }) => {
    const email = 'auth-e2e@example.com';
    const password = 'Password123!';

    const registered = await registerUser(request, email, password);
    expect(registered.accessToken).toBeDefined();
    expect(registered.refreshToken).toBeDefined();

    const loggedIn = await loginUser(request, email, password);
    expect(loggedIn.accessToken).toBeDefined();

    const me = await request.get('/api/v1/auth/me', {
      headers: { Authorization: `Bearer ${loggedIn.accessToken}` },
    });

    expect(me.ok()).toBeTruthy();
    const body = await me.json();
    expect(body.success).toBe(true);
    expect(body.data.email).toBe(email);
  });

  test('rejects login with invalid credentials', async ({ request }) => {
    await registerUser(request, 'bad-auth@example.com');

    const response = await request.post('/api/v1/auth/login', {
      data: { email: 'bad-auth@example.com', password: 'wrong-password' },
    });

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test('rotates refresh tokens', async ({ request }) => {
    const { refreshToken } = await registerUser(request, 'refresh@example.com');

    const response = await request.post('/api/v1/auth/refresh', {
      data: { refreshToken },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.accessToken).toBeDefined();
    expect(body.data.refreshToken).toBeDefined();
  });
});
