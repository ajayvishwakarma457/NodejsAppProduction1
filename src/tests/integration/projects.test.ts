import { describe, it, expect } from 'vitest';
import { StatusCodes } from 'http-status-codes';
import { api, register, createAdminUser, createTeam, createProject, authRequest } from './helpers';

describe('GET /api/v1/projects/dashboard', () => {
  it('returns dashboard data scoped to the user', async () => {
    const { session } = await register({ email: 'project-dashboard@example.com' });
    const { teamId } = await createTeam(session.accessToken);
    await createProject(session.accessToken, { teamId });

    const response = await authRequest('get', '/api/v1/projects/dashboard', session.accessToken);

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.success).toBe(true);
    expect(response.body.data.statusDistribution).toBeDefined();
  });
});

describe('GET /api/v1/projects', () => {
  it('lists projects owned by the user', async () => {
    const { session } = await register({ email: 'project-owner-list@example.com' });
    const { teamId } = await createTeam(session.accessToken);
    await createProject(session.accessToken, { teamId });

    const response = await authRequest('get', '/api/v1/projects', session.accessToken);

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.success).toBe(true);
    expect(response.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('allows admins to list any project', async () => {
    const { session: owner } = await register({ email: 'project-admin-list-owner@example.com' });
    const adminSession = await createAdminUser({ email: 'project-admin-list@example.com' });
    const { teamId } = await createTeam(owner.accessToken);
    await createProject(owner.accessToken, { teamId });

    const response = await authRequest('get', '/api/v1/projects', adminSession.accessToken);

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.data.length).toBeGreaterThanOrEqual(1);
  });
});

describe('GET /api/v1/projects/:id', () => {
  it('returns a project by id', async () => {
    const { session } = await register({ email: 'project-owner-get@example.com' });
    const { teamId } = await createTeam(session.accessToken);
    const { projectId } = await createProject(session.accessToken, { teamId });

    const response = await authRequest('get', `/api/v1/projects/${projectId}`, session.accessToken);

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.data.id).toBe(projectId);
  });

  it('returns 404 for unknown project', async () => {
    const { session } = await register({ email: 'project-owner-get-missing@example.com' });

    const response = await authRequest(
      'get',
      '/api/v1/projects/000000000000000000000000',
      session.accessToken
    );

    expect(response.status).toBe(StatusCodes.NOT_FOUND);
  });
});

describe('POST /api/v1/projects', () => {
  it('creates a project under a team', async () => {
    const { session } = await register({ email: 'project-owner-create@example.com' });
    const { teamId } = await createTeam(session.accessToken);

    const response = await authRequest('post', '/api/v1/projects', session.accessToken).send({
      name: 'New Project',
      description: 'A test project',
      teamId,
    });

    expect(response.status).toBe(StatusCodes.CREATED);
    expect(response.body.data.name).toBe('New Project');
    expect(response.body.data.ownerId).toBe(session.userId);
    expect(response.body.data.teamId).toBe(teamId);
  });

  it('rejects missing teamId', async () => {
    const { session } = await register({ email: 'project-owner-create-invalid@example.com' });

    const response = await authRequest('post', '/api/v1/projects', session.accessToken).send({
      name: 'Orphan Project',
      description: 'No team',
    });

    expect(response.status).toBe(StatusCodes.BAD_REQUEST);
  });
});

describe('PATCH /api/v1/projects/:id', () => {
  it('allows the owner to update the project', async () => {
    const { session } = await register({ email: 'project-owner-update@example.com' });
    const { teamId } = await createTeam(session.accessToken);
    const { projectId } = await createProject(session.accessToken, { teamId });

    const response = await authRequest(
      'patch',
      `/api/v1/projects/${projectId}`,
      session.accessToken
    ).send({
      name: 'Updated Project Name',
    });

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.data.name).toBe('Updated Project Name');
  });

  it('forbids non-owners from updating the project', async () => {
    const { session: owner } = await register({ email: 'project-owner-update-deny@example.com' });
    const { session: intruder } = await register({ email: 'project-intruder-update@example.com' });
    const { teamId } = await createTeam(owner.accessToken);
    const { projectId } = await createProject(owner.accessToken, { teamId });

    const response = await authRequest(
      'patch',
      `/api/v1/projects/${projectId}`,
      intruder.accessToken
    ).send({
      name: 'Hacked Project Name',
    });

    expect(response.status).toBe(StatusCodes.FORBIDDEN);
  });
});

describe('DELETE /api/v1/projects/:id', () => {
  it('allows the owner to delete the project', async () => {
    const { session } = await register({ email: 'project-owner-delete@example.com' });
    const { teamId } = await createTeam(session.accessToken);
    const { projectId } = await createProject(session.accessToken, { teamId });

    const response = await authRequest(
      'delete',
      `/api/v1/projects/${projectId}`,
      session.accessToken
    );

    expect(response.status).toBe(StatusCodes.NO_CONTENT);
  });

  it('forbids non-owners from deleting the project', async () => {
    const { session: owner } = await register({ email: 'project-owner-delete-deny@example.com' });
    const { session: intruder } = await register({ email: 'project-intruder-delete@example.com' });
    const { teamId } = await createTeam(owner.accessToken);
    const { projectId } = await createProject(owner.accessToken, { teamId });

    const response = await authRequest(
      'delete',
      `/api/v1/projects/${projectId}`,
      intruder.accessToken
    );

    expect(response.status).toBe(StatusCodes.FORBIDDEN);
  });
});
