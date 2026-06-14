import { test, expect } from '@playwright/test';
import { cleanupDatabase, registerUser, createAdminUser } from './fixtures';

test.describe('Users', () => {
  test.beforeEach(async () => {
    await cleanupDatabase();
  });

  test('allows admins to list and create users', async ({ request }) => {
    const admin = await createAdminUser(request, `admin-users@example.com`);
    await registerUser(request, `member-users@example.com`);

    const list = await request.get('/api/v1/users?page=1&limit=10', {
      headers: { Authorization: `Bearer ${admin.accessToken}` },
    });

    expect(list.ok()).toBeTruthy();
    const listBody = await list.json();
    expect(listBody.success).toBe(true);
    expect(listBody.data.length).toBeGreaterThanOrEqual(2);

    const create = await request.post('/api/v1/users', {
      headers: { Authorization: `Bearer ${admin.accessToken}` },
      data: {
        firstName: 'Created',
        lastName: 'ByAdmin',
        email: `created-admin@example.com`,
        password: 'Password123!',
        role: 'member',
      },
    });

    expect(create.ok()).toBeTruthy();
    const createBody = await create.json();
    expect(createBody.success).toBe(true);
    expect(createBody.data.email).toBe('created-admin@example.com');
  });

  test('forbids non-admins from listing users', async ({ request }) => {
    const user = await registerUser(request, `member-deny@example.com`);

    const response = await request.get('/api/v1/users', {
      headers: { Authorization: `Bearer ${user.accessToken}` },
    });

    expect(response.status()).toBe(403);
  });

  test('allows users to retrieve their own profile', async ({ request }) => {
    const user = await registerUser(request, `member-self@example.com`);

    const response = await request.get(`/api/v1/users/${user.id}`, {
      headers: { Authorization: `Bearer ${user.accessToken}` },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.data.id).toBe(user.id);
  });

  test('forbids users from retrieving other profiles', async ({ request }) => {
    const userOne = await registerUser(request, `member-one@example.com`);
    const userTwo = await registerUser(request, `member-two@example.com`);

    const response = await request.get(`/api/v1/users/${userTwo.id}`, {
      headers: { Authorization: `Bearer ${userOne.accessToken}` },
    });

    expect(response.status()).toBe(403);
  });
});
