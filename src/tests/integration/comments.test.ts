import { describe, it, expect } from 'vitest';
import { StatusCodes } from 'http-status-codes';
import {
  api,
  register,
  createTeam,
  createProject,
  createTask,
  createComment,
  authRequest,
} from './helpers';

describe('GET /api/v1/comments', () => {
  it('lists comments filtered by taskId', async () => {
    const { session } = await register({ email: 'comment-list@example.com' });
    const { teamId } = await createTeam(session.accessToken);
    const { projectId } = await createProject(session.accessToken, { teamId });
    const { taskId } = await createTask(session.accessToken, {
      projectId,
      assignedTo: session.userId,
    });
    await createComment(session.accessToken, { taskId });

    const response = await authRequest('get', '/api/v1/comments', session.accessToken).query({
      taskId,
    });

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.data.length).toBeGreaterThanOrEqual(1);
  });
});

describe('GET /api/v1/comments/:id', () => {
  it('returns a comment by id', async () => {
    const { session } = await register({ email: 'comment-get@example.com' });
    const { teamId } = await createTeam(session.accessToken);
    const { projectId } = await createProject(session.accessToken, { teamId });
    const { taskId } = await createTask(session.accessToken, {
      projectId,
      assignedTo: session.userId,
    });
    const { commentId } = await createComment(session.accessToken, { taskId });

    const response = await authRequest('get', `/api/v1/comments/${commentId}`, session.accessToken);

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.data.id).toBe(commentId);
  });
});

describe('POST /api/v1/comments', () => {
  it('creates a comment on a task', async () => {
    const { session } = await register({ email: 'comment-create@example.com' });
    const { teamId } = await createTeam(session.accessToken);
    const { projectId } = await createProject(session.accessToken, { teamId });
    const { taskId } = await createTask(session.accessToken, {
      projectId,
      assignedTo: session.userId,
    });

    const response = await authRequest('post', '/api/v1/comments', session.accessToken).send({
      taskId,
      content: 'This is a test comment',
    });

    expect(response.status).toBe(StatusCodes.CREATED);
    expect(response.body.data.content).toBe('This is a test comment');
    expect(response.body.data.userId).toBe(session.userId);
  });

  it('rejects missing taskId', async () => {
    const { session } = await register({ email: 'comment-create-invalid@example.com' });

    const response = await authRequest('post', '/api/v1/comments', session.accessToken).send({
      content: 'No task id',
    });

    expect(response.status).toBe(StatusCodes.BAD_REQUEST);
  });
});

describe('PATCH /api/v1/comments/:id', () => {
  it('allows the author to update the comment', async () => {
    const { session } = await register({ email: 'comment-update@example.com' });
    const { teamId } = await createTeam(session.accessToken);
    const { projectId } = await createProject(session.accessToken, { teamId });
    const { taskId } = await createTask(session.accessToken, {
      projectId,
      assignedTo: session.userId,
    });
    const { commentId } = await createComment(session.accessToken, { taskId });

    const response = await authRequest(
      'patch',
      `/api/v1/comments/${commentId}`,
      session.accessToken
    ).send({
      content: 'Updated comment content',
    });

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.data.content).toBe('Updated comment content');
  });

  it('forbids non-authors from updating the comment', async () => {
    const { session: author } = await register({ email: 'comment-update-deny@example.com' });
    const { session: intruder } = await register({ email: 'comment-intruder-update@example.com' });
    const { teamId } = await createTeam(author.accessToken);
    const { projectId } = await createProject(author.accessToken, { teamId });
    const { taskId } = await createTask(author.accessToken, {
      projectId,
      assignedTo: author.userId,
    });
    const { commentId } = await createComment(author.accessToken, { taskId });

    const response = await authRequest(
      'patch',
      `/api/v1/comments/${commentId}`,
      intruder.accessToken
    ).send({
      content: 'Hacked comment',
    });

    expect(response.status).toBe(StatusCodes.FORBIDDEN);
  });
});

describe('DELETE /api/v1/comments/:id', () => {
  it('allows the author to delete the comment', async () => {
    const { session } = await register({ email: 'comment-delete@example.com' });
    const { teamId } = await createTeam(session.accessToken);
    const { projectId } = await createProject(session.accessToken, { teamId });
    const { taskId } = await createTask(session.accessToken, {
      projectId,
      assignedTo: session.userId,
    });
    const { commentId } = await createComment(session.accessToken, { taskId });

    const response = await authRequest(
      'delete',
      `/api/v1/comments/${commentId}`,
      session.accessToken
    );

    expect(response.status).toBe(StatusCodes.NO_CONTENT);
  });

  it('forbids non-authors from deleting the comment', async () => {
    const { session: author } = await register({ email: 'comment-delete-deny@example.com' });
    const { session: intruder } = await register({ email: 'comment-intruder-delete@example.com' });
    const { teamId } = await createTeam(author.accessToken);
    const { projectId } = await createProject(author.accessToken, { teamId });
    const { taskId } = await createTask(author.accessToken, {
      projectId,
      assignedTo: author.userId,
    });
    const { commentId } = await createComment(author.accessToken, { taskId });

    const response = await authRequest(
      'delete',
      `/api/v1/comments/${commentId}`,
      intruder.accessToken
    );

    expect(response.status).toBe(StatusCodes.FORBIDDEN);
  });
});
