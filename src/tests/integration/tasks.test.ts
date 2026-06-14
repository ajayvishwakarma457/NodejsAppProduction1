import { describe, it, expect } from 'vitest';
import { StatusCodes } from 'http-status-codes';
import {
  api,
  register,
  createAdminUser,
  createTeam,
  createProject,
  createTask,
  authRequest,
} from './helpers';

describe('GET /api/v1/tasks/dashboard', () => {
  it('returns task dashboard data', async () => {
    const { session } = await register({ email: 'task-dashboard@example.com' });
    const { teamId } = await createTeam(session.accessToken);
    const { projectId } = await createProject(session.accessToken, { teamId });
    await createTask(session.accessToken, { projectId, assignedTo: session.userId });

    const response = await authRequest('get', '/api/v1/tasks/dashboard', session.accessToken);

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.data.statusDistribution).toBeDefined();
  });
});

describe('GET /api/v1/tasks', () => {
  it('lists tasks created by or assigned to the user', async () => {
    const { session } = await register({ email: 'task-creator-list@example.com' });
    const { teamId } = await createTeam(session.accessToken);
    const { projectId } = await createProject(session.accessToken, { teamId });
    await createTask(session.accessToken, { projectId, assignedTo: session.userId });

    const response = await authRequest('get', '/api/v1/tasks', session.accessToken);

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('filters tasks by projectId', async () => {
    const { session } = await register({ email: 'task-filter@example.com' });
    const { teamId } = await createTeam(session.accessToken);
    const { projectId } = await createProject(session.accessToken, { teamId });
    await createTask(session.accessToken, { projectId, assignedTo: session.userId });

    const response = await authRequest('get', '/api/v1/tasks', session.accessToken).query({
      projectId,
    });

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.data.every((t: { projectId: string }) => t.projectId === projectId)).toBe(
      true
    );
  });
});

describe('GET /api/v1/tasks/:id', () => {
  it('returns a task by id', async () => {
    const { session } = await register({ email: 'task-creator-get@example.com' });
    const { teamId } = await createTeam(session.accessToken);
    const { projectId } = await createProject(session.accessToken, { teamId });
    const { taskId } = await createTask(session.accessToken, {
      projectId,
      assignedTo: session.userId,
    });

    const response = await authRequest('get', `/api/v1/tasks/${taskId}`, session.accessToken);

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.data.id).toBe(taskId);
  });
});

describe('POST /api/v1/tasks', () => {
  it('creates a task under a project', async () => {
    const { session } = await register({ email: 'task-creator-create@example.com' });
    const { teamId } = await createTeam(session.accessToken);
    const { projectId } = await createProject(session.accessToken, { teamId });

    const response = await authRequest('post', '/api/v1/tasks', session.accessToken).send({
      title: 'New Task',
      description: 'A test task',
      projectId,
      assignedTo: session.userId,
      priority: 'high',
    });

    expect(response.status).toBe(StatusCodes.CREATED);
    expect(response.body.data.title).toBe('New Task');
    expect(response.body.data.createdBy).toBe(session.userId);
    expect(response.body.data.projectId).toBe(projectId);
  });

  it('rejects missing projectId', async () => {
    const { session } = await register({ email: 'task-creator-invalid@example.com' });

    const response = await authRequest('post', '/api/v1/tasks', session.accessToken).send({
      title: 'Orphan Task',
      description: 'No project',
      assignedTo: session.userId,
    });

    expect(response.status).toBe(StatusCodes.BAD_REQUEST);
  });
});

describe('PATCH /api/v1/tasks/:id', () => {
  it('allows the creator to update the task', async () => {
    const { session } = await register({ email: 'task-creator-update@example.com' });
    const { teamId } = await createTeam(session.accessToken);
    const { projectId } = await createProject(session.accessToken, { teamId });
    const { taskId } = await createTask(session.accessToken, {
      projectId,
      assignedTo: session.userId,
    });

    const response = await authRequest(
      'patch',
      `/api/v1/tasks/${taskId}`,
      session.accessToken
    ).send({
      status: 'in-progress',
    });

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.data.status).toBe('in-progress');
  });

  it('forbids non-creators from updating the task', async () => {
    const { session: creator } = await register({ email: 'task-creator-update-deny@example.com' });
    const { session: intruder } = await register({ email: 'task-intruder-update@example.com' });
    const { teamId } = await createTeam(creator.accessToken);
    const { projectId } = await createProject(creator.accessToken, { teamId });
    const { taskId } = await createTask(creator.accessToken, {
      projectId,
      assignedTo: creator.userId,
    });

    const response = await authRequest(
      'patch',
      `/api/v1/tasks/${taskId}`,
      intruder.accessToken
    ).send({
      status: 'done',
    });

    expect(response.status).toBe(StatusCodes.FORBIDDEN);
  });
});

describe('DELETE /api/v1/tasks/:id', () => {
  it('allows the creator to delete the task', async () => {
    const { session } = await register({ email: 'task-creator-delete@example.com' });
    const { teamId } = await createTeam(session.accessToken);
    const { projectId } = await createProject(session.accessToken, { teamId });
    const { taskId } = await createTask(session.accessToken, {
      projectId,
      assignedTo: session.userId,
    });

    const response = await authRequest('delete', `/api/v1/tasks/${taskId}`, session.accessToken);

    expect(response.status).toBe(StatusCodes.NO_CONTENT);
  });

  it('forbids non-creators from deleting the task', async () => {
    const { session: creator } = await register({ email: 'task-creator-delete-deny@example.com' });
    const { session: intruder } = await register({ email: 'task-intruder-delete@example.com' });
    const { teamId } = await createTeam(creator.accessToken);
    const { projectId } = await createProject(creator.accessToken, { teamId });
    const { taskId } = await createTask(creator.accessToken, {
      projectId,
      assignedTo: creator.userId,
    });

    const response = await authRequest('delete', `/api/v1/tasks/${taskId}`, intruder.accessToken);

    expect(response.status).toBe(StatusCodes.FORBIDDEN);
  });
});
