import { describe, it, expect } from 'vitest';
import { StatusCodes } from 'http-status-codes';
import { api, register, createAdminUser, createTeam, authRequest } from './helpers';

describe('GET /api/v1/teams', () => {
  it('lists teams the user owns or belongs to', async () => {
    const { session } = await register({ email: 'team-owner-list@example.com' });
    await createTeam(session.accessToken);

    const response = await authRequest('get', '/api/v1/teams', session.accessToken);

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.success).toBe(true);
    expect(response.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('rejects unauthenticated access', async () => {
    const response = await api.get('/api/v1/teams');

    expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
  });
});

describe('GET /api/v1/teams/:id', () => {
  it('returns a team by id', async () => {
    const { session } = await register({ email: 'team-owner-get@example.com' });
    const { teamId } = await createTeam(session.accessToken);

    const response = await authRequest('get', `/api/v1/teams/${teamId}`, session.accessToken);

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe(teamId);
    expect(response.body.data.ownerId).toBe(session.userId);
  });

  it('returns 404 for unknown team', async () => {
    const { session } = await register({ email: 'team-owner-get-missing@example.com' });

    const response = await authRequest(
      'get',
      '/api/v1/teams/000000000000000000000000',
      session.accessToken
    );

    expect(response.status).toBe(StatusCodes.NOT_FOUND);
  });
});

describe('POST /api/v1/teams', () => {
  it('creates a team and sets the creator as owner', async () => {
    const { session } = await register({ email: 'team-owner-create@example.com' });

    const response = await authRequest('post', '/api/v1/teams', session.accessToken).send({
      name: 'New Team',
      description: 'A test team',
    });

    expect(response.status).toBe(StatusCodes.CREATED);
    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe('New Team');
    expect(response.body.data.ownerId).toBe(session.userId);
    expect(response.body.data.members.length).toBe(0);
  });

  it('rejects invalid payloads', async () => {
    const { session } = await register({ email: 'team-owner-create-invalid@example.com' });

    const response = await authRequest('post', '/api/v1/teams', session.accessToken).send({
      name: '',
    });

    expect(response.status).toBe(StatusCodes.BAD_REQUEST);
  });
});

describe('PATCH /api/v1/teams/:id', () => {
  it('allows the owner to update the team', async () => {
    const { session } = await register({ email: 'team-owner-update@example.com' });
    const { teamId } = await createTeam(session.accessToken);

    const response = await authRequest(
      'patch',
      `/api/v1/teams/${teamId}`,
      session.accessToken
    ).send({
      name: 'Updated Team Name',
    });

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe('Updated Team Name');
  });

  it('forbids non-owners from updating the team', async () => {
    const { session: owner } = await register({ email: 'team-owner-update-deny@example.com' });
    const { session: member } = await register({ email: 'team-member-update-deny@example.com' });
    const { teamId } = await createTeam(owner.accessToken);

    const response = await authRequest('patch', `/api/v1/teams/${teamId}`, member.accessToken).send(
      {
        name: 'Hacked Team Name',
      }
    );

    expect(response.status).toBe(StatusCodes.FORBIDDEN);
  });
});

describe('DELETE /api/v1/teams/:id', () => {
  it('allows the owner to delete the team', async () => {
    const { session } = await register({ email: 'team-owner-delete@example.com' });
    const { teamId } = await createTeam(session.accessToken);

    const response = await authRequest('delete', `/api/v1/teams/${teamId}`, session.accessToken);

    expect(response.status).toBe(StatusCodes.NO_CONTENT);
  });

  it('forbids non-owners from deleting the team', async () => {
    const { session: owner } = await register({ email: 'team-owner-delete-deny@example.com' });
    const { session: member } = await register({ email: 'team-member-delete-deny@example.com' });
    const { teamId } = await createTeam(owner.accessToken);

    const response = await authRequest('delete', `/api/v1/teams/${teamId}`, member.accessToken);

    expect(response.status).toBe(StatusCodes.FORBIDDEN);
  });
});

describe('POST /api/v1/teams/:id/members', () => {
  it('allows the owner to add a member', async () => {
    const { session: owner } = await register({ email: 'team-owner-add-member@example.com' });
    const { session: member } = await register({ email: 'team-member-added@example.com' });
    const { teamId } = await createTeam(owner.accessToken);

    const response = await authRequest(
      'post',
      `/api/v1/teams/${teamId}/members`,
      owner.accessToken
    ).send({
      userId: member.userId,
      role: 'member',
    });

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.success).toBe(true);
    expect(response.body.data.members.length).toBe(1);
    expect(response.body.data.members[0].userId).toBe(member.userId);
  });

  it('forbids non-owners from adding members', async () => {
    const { session: owner } = await register({ email: 'team-owner-add-deny@example.com' });
    const { session: member } = await register({ email: 'team-member-add-deny@example.com' });
    const { session: intruder } = await register({ email: 'team-intruder-add@example.com' });
    const { teamId } = await createTeam(owner.accessToken);

    await authRequest('post', `/api/v1/teams/${teamId}/members`, owner.accessToken).send({
      userId: member.userId,
      role: 'member',
    });

    const response = await authRequest(
      'post',
      `/api/v1/teams/${teamId}/members`,
      intruder.accessToken
    ).send({
      userId: intruder.userId,
      role: 'member',
    });

    expect(response.status).toBe(StatusCodes.FORBIDDEN);
  });
});

describe('DELETE /api/v1/teams/:id/members', () => {
  it('allows the owner to remove a member', async () => {
    const { session: owner } = await register({ email: 'team-owner-remove-member@example.com' });
    const { session: member } = await register({ email: 'team-member-removed@example.com' });
    const { teamId } = await createTeam(owner.accessToken);

    await authRequest('post', `/api/v1/teams/${teamId}/members`, owner.accessToken).send({
      userId: member.userId,
      role: 'member',
    });

    const response = await authRequest(
      'delete',
      `/api/v1/teams/${teamId}/members`,
      owner.accessToken
    ).send({
      userId: member.userId,
    });

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.data.members.length).toBe(0);
  });

  it('forbids non-owners from removing members', async () => {
    const { session: owner } = await register({ email: 'team-owner-remove-deny@example.com' });
    const { session: member } = await register({ email: 'team-member-remove-deny@example.com' });
    const { teamId } = await createTeam(owner.accessToken);

    await authRequest('post', `/api/v1/teams/${teamId}/members`, owner.accessToken).send({
      userId: member.userId,
      role: 'member',
    });

    const response = await authRequest(
      'delete',
      `/api/v1/teams/${teamId}/members`,
      member.accessToken
    ).send({
      userId: member.userId,
    });

    expect(response.status).toBe(StatusCodes.FORBIDDEN);
  });
});
