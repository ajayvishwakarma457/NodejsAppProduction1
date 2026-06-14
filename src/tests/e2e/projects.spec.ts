import { test, expect } from '@playwright/test';
import { cleanupDatabase, registerUser, createTeam, createProject } from './fixtures';

test.describe('Projects', () => {
  test.beforeEach(async () => {
    await cleanupDatabase();
  });

  test('creates, reads, updates, and deletes a project under a team', async ({ request }) => {
    const user = await registerUser(request, `project-owner@example.com`);
    const team = await createTeam(request, user.accessToken);

    const create = await request.post('/api/v1/projects', {
      headers: { Authorization: `Bearer ${user.accessToken}` },
      data: { name: 'E2E Project', description: 'Created by Playwright', teamId: team.id },
    });

    expect(create.ok()).toBeTruthy();
    const created = await create.json();
    expect(created.success).toBe(true);
    expect(created.data.name).toBe('E2E Project');
    expect(created.data.ownerId).toBe(user.id);

    const projectId = created.data.id;

    const read = await request.get(`/api/v1/projects/${projectId}`, {
      headers: { Authorization: `Bearer ${user.accessToken}` },
    });
    expect(read.ok()).toBeTruthy();
    expect((await read.json()).data.name).toBe('E2E Project');

    const update = await request.patch(`/api/v1/projects/${projectId}`, {
      headers: { Authorization: `Bearer ${user.accessToken}` },
      data: { name: 'E2E Project Updated' },
    });
    expect(update.ok()).toBeTruthy();
    expect((await update.json()).data.name).toBe('E2E Project Updated');

    const remove = await request.delete(`/api/v1/projects/${projectId}`, {
      headers: { Authorization: `Bearer ${user.accessToken}` },
    });
    expect(remove.ok()).toBeTruthy();
  });

  test('forbids non-owners from updating a project', async ({ request }) => {
    const owner = await registerUser(request, `project-owner-deny@example.com`);
    const intruder = await registerUser(request, `project-intruder@example.com`);
    const team = await createTeam(request, owner.accessToken);
    const project = await createProject(request, owner.accessToken, team.id);

    const update = await request.patch(`/api/v1/projects/${project.id}`, {
      headers: { Authorization: `Bearer ${intruder.accessToken}` },
      data: { name: 'Hijacked' },
    });

    expect(update.status()).toBe(403);
  });

  test('rejects a project without a teamId', async ({ request }) => {
    const user = await registerUser(request, `project-invalid@example.com`);

    const response = await request.post('/api/v1/projects', {
      headers: { Authorization: `Bearer ${user.accessToken}` },
      data: { name: 'Orphan Project', description: 'No team' },
    });

    expect(response.status()).toBe(400);
  });
});
