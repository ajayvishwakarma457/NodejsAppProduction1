import { expect } from '@playwright/test';
import { test, cleanupDatabase } from './fixtures';

test.describe('Teams', () => {
  test.beforeEach(async () => {
    await cleanupDatabase();
  });

  test('creates, reads, updates, and deletes a team', async ({ request, authUser }) => {
    // Create
    const create = await request.post('/api/v1/teams', {
      headers: { Authorization: `Bearer ${authUser.accessToken}` },
      data: { name: 'E2E Team', description: 'Created by Playwright' },
    });

    expect(create.ok()).toBeTruthy();
    const created = await create.json();
    expect(created.success).toBe(true);
    expect(created.data.name).toBe('E2E Team');
    expect(created.data.ownerId).toBe(authUser.id);

    const teamId = created.data.id;

    // Read
    const read = await request.get(`/api/v1/teams/${teamId}`, {
      headers: { Authorization: `Bearer ${authUser.accessToken}` },
    });

    expect(read.ok()).toBeTruthy();
    const readBody = await read.json();
    expect(readBody.data.name).toBe('E2E Team');

    // Update
    const update = await request.patch(`/api/v1/teams/${teamId}`, {
      headers: { Authorization: `Bearer ${authUser.accessToken}` },
      data: { name: 'E2E Team Updated' },
    });

    expect(update.ok()).toBeTruthy();
    const updated = await update.json();
    expect(updated.data.name).toBe('E2E Team Updated');

    // Delete
    const remove = await request.delete(`/api/v1/teams/${teamId}`, {
      headers: { Authorization: `Bearer ${authUser.accessToken}` },
    });

    expect(remove.ok()).toBeTruthy();
  });

  test('forbids non-owners from updating a team', async ({ request, authUser }) => {
    const create = await request.post('/api/v1/teams', {
      headers: { Authorization: `Bearer ${authUser.accessToken}` },
      data: { name: 'Owner Team', description: 'Owned by auth user' },
    });

    expect(create.ok()).toBeTruthy();
    const createBody = await create.json();
    expect(createBody.success).toBe(true);
    const teamId = createBody.data.id;

    // Create a second user and attempt an update.
    const other = await request.post('/api/v1/auth/register', {
      data: {
        firstName: 'Other',
        lastName: 'User',
        email: `other-${Date.now()}@example.com`,
        password: 'Password123!',
        confirmPassword: 'Password123!',
      },
    });

    expect(other.ok()).toBeTruthy();
    const otherBody = await other.json();
    const otherToken = otherBody.data.tokens.accessToken;

    const update = await request.patch(`/api/v1/teams/${teamId}`, {
      headers: { Authorization: `Bearer ${otherToken}` },
      data: { name: 'Hijacked' },
    });

    expect(update.status()).toBe(403);
  });
});
