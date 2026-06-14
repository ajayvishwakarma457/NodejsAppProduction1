import { test, expect } from '@playwright/test';
import { cleanupDatabase, registerUser, createTeam, createProject, createTask } from './fixtures';

test.describe('Tasks', () => {
  test.beforeEach(async () => {
    await cleanupDatabase();
  });

  test('creates, reads, updates, and deletes a task under a project', async ({ request }) => {
    const user = await registerUser(request, `task-creator@example.com`);
    const team = await createTeam(request, user.accessToken);
    const project = await createProject(request, user.accessToken, team.id);

    const create = await request.post('/api/v1/tasks', {
      headers: { Authorization: `Bearer ${user.accessToken}` },
      data: {
        title: 'E2E Task',
        description: 'Created by Playwright',
        projectId: project.id,
        assignedTo: user.id,
        priority: 'high',
      },
    });

    expect(create.ok()).toBeTruthy();
    const created = await create.json();
    expect(created.success).toBe(true);
    expect(created.data.title).toBe('E2E Task');
    expect(created.data.createdBy).toBe(user.id);

    const taskId = created.data.id;

    const read = await request.get(`/api/v1/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${user.accessToken}` },
    });
    expect(read.ok()).toBeTruthy();
    expect((await read.json()).data.title).toBe('E2E Task');

    const update = await request.patch(`/api/v1/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${user.accessToken}` },
      data: { title: 'E2E Task Updated' },
    });
    expect(update.ok()).toBeTruthy();
    expect((await update.json()).data.title).toBe('E2E Task Updated');

    const remove = await request.delete(`/api/v1/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${user.accessToken}` },
    });
    expect(remove.ok()).toBeTruthy();
  });

  test('forbids non-creators from updating a task', async ({ request }) => {
    const creator = await registerUser(request, `task-creator-deny@example.com`);
    const intruder = await registerUser(request, `task-intruder@example.com`);
    const team = await createTeam(request, creator.accessToken);
    const project = await createProject(request, creator.accessToken, team.id);
    const task = await createTask(request, creator.accessToken, project.id, creator.id);

    const update = await request.patch(`/api/v1/tasks/${task.id}`, {
      headers: { Authorization: `Bearer ${intruder.accessToken}` },
      data: { title: 'Hijacked' },
    });

    expect(update.status()).toBe(403);
  });

  test('lists tasks filtered by projectId', async ({ request }) => {
    const user = await registerUser(request, `task-list@example.com`);
    const team = await createTeam(request, user.accessToken);
    const project = await createProject(request, user.accessToken, team.id);
    await createTask(request, user.accessToken, project.id, user.id);

    const response = await request.get(`/api/v1/tasks?projectId=${project.id}`, {
      headers: { Authorization: `Bearer ${user.accessToken}` },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.data.every((t: { projectId: string }) => t.projectId === project.id)).toBe(true);
  });
});
