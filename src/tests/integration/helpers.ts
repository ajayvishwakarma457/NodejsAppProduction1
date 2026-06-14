import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../../app';
import { redisClient } from '../../config/redis';
import { UserModel } from '../../modules/users/user.model';

/**
 * Integration test helpers.
 *
 * Provides convenience functions for building HTTP requests, creating
 * authenticated sessions, and cleaning up test data between runs.
 */

export const api = request(app);

/** Base user fixture used across integration tests. */
export interface TestUser {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export const defaultUser: TestUser = {
  firstName: 'Integration',
  lastName: 'Test',
  email: 'integration-test@example.com',
  password: 'Password123!',
};

export const adminUser: TestUser = {
  firstName: 'Admin',
  lastName: 'Test',
  email: 'admin-test@example.com',
  password: 'Password123!',
};

export interface AuthSession {
  userId: string;
  accessToken: string;
  refreshToken: string;
}

/**
 * Register a new user and return the resulting auth session.
 * If no payload is provided, the default test user is used.
 */
export async function register(payload: Partial<TestUser> = {}): Promise<{
  session: AuthSession;
  response: request.Response;
}> {
  const response = await api
    .post('/api/v1/auth/register')
    .send({ ...defaultUser, ...payload })
    .expect(201);

  const session: AuthSession = {
    userId: response.body.data.user.id,
    accessToken: response.body.data.tokens.accessToken,
    refreshToken: response.body.data.tokens.refreshToken,
  };

  return { session, response };
}

/**
 * Log in an existing user and return a fresh auth session.
 */
export async function login(email: string, password: string): Promise<AuthSession> {
  const response = await api.post('/api/v1/auth/login').send({ email, password }).expect(200);

  return {
    userId: response.body.data.user.id,
    accessToken: response.body.data.tokens.accessToken,
    refreshToken: response.body.data.tokens.refreshToken,
  };
}

/**
 * Create an authenticated Supertest agent pre-configured with a Bearer token.
 */
export function authenticatedAgent(accessToken: string) {
  return request(app).set('Authorization', `Bearer ${accessToken}`);
}

/**
 * Helper to send an authenticated request in a single call.
 */
export function authRequest(
  method: 'get' | 'post' | 'patch' | 'put' | 'delete',
  path: string,
  accessToken: string
) {
  return api[method](path).set('Authorization', `Bearer ${accessToken}`);
}

/**
 * Delete all documents from every MongoDB collection.
 */
export async function cleanupCollections(): Promise<void> {
  if (mongoose.connection.readyState === 0) return;

  const collections = mongoose.connection.collections;
  await Promise.all(
    Object.values(collections).map(async (collection) => {
      try {
        await collection.deleteMany({});
      } catch {
        // Ignore errors from capped/system collections that cannot be cleared.
      }
    })
  );
}

/**
 * Delete all Redis keys matching the application prefix.
 */
export async function cleanupRedis(): Promise<void> {
  if (!redisClient.isOpen) return;
  await redisClient.flushDb();
}

/**
 * Create a user with admin role directly in the database and return an
 * authenticated session. Useful for testing admin-only endpoints.
 */
export async function createAdminUser(payload: Partial<TestUser> = {}): Promise<AuthSession> {
  const merged = { ...adminUser, ...payload };
  await UserModel.create({
    ...merged,
    role: 'admin',
    isVerified: true,
  });

  return login(merged.email, merged.password);
}

/* ------------------------------------------------------------------ */
// Entity factories — use the HTTP API so integration tests exercise
// the full request/response stack (auth, validation, controllers, DB).
/* ------------------------------------------------------------------ */

export interface CreateTeamPayload {
  name: string;
  description: string;
}

export async function createTeam(
  accessToken: string,
  payload: Partial<CreateTeamPayload> = {}
): Promise<{ teamId: string; response: request.Response }> {
  const response = await authRequest('post', '/api/v1/teams', accessToken)
    .send({
      name: 'Integration Team',
      description: 'Created by integration tests',
      ...payload,
    })
    .expect(201);

  return { teamId: response.body.data.id, response };
}

export interface CreateProjectPayload {
  name: string;
  description: string;
  teamId: string;
  status?: 'active' | 'completed' | 'archived';
}

export async function createProject(
  accessToken: string,
  payload: Partial<CreateProjectPayload> = {}
): Promise<{ projectId: string; response: request.Response }> {
  const response = await authRequest('post', '/api/v1/projects', accessToken)
    .send({
      name: 'Integration Project',
      description: 'Created by integration tests',
      status: 'active',
      ...payload,
    })
    .expect(201);

  return { projectId: response.body.data.id, response };
}

export interface CreateTaskPayload {
  title: string;
  description: string;
  projectId: string;
  assignedTo: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  status?: 'todo' | 'in-progress' | 'review' | 'done';
}

export async function createTask(
  accessToken: string,
  payload: Partial<CreateTaskPayload> = {}
): Promise<{ taskId: string; response: request.Response }> {
  const response = await authRequest('post', '/api/v1/tasks', accessToken)
    .send({
      title: 'Integration Task',
      description: 'Created by integration tests',
      priority: 'medium',
      status: 'todo',
      ...payload,
    })
    .expect(201);

  return { taskId: response.body.data.id, response };
}

export interface CreateCommentPayload {
  taskId: string;
  content: string;
  parentId?: string;
}

export async function createComment(
  accessToken: string,
  payload: Partial<CreateCommentPayload> = {}
): Promise<{ commentId: string; response: request.Response }> {
  const response = await authRequest('post', '/api/v1/comments', accessToken)
    .send({
      content: 'Integration test comment',
      ...payload,
    })
    .expect(201);

  return { commentId: response.body.data.id, response };
}

export interface CreateNotificationPayload {
  userId: string;
  title: string;
  message: string;
  type?: string;
  channels?: string[];
}

export async function createNotification(
  accessToken: string,
  payload: Partial<CreateNotificationPayload> = {}
): Promise<{ notificationId: string; response: request.Response }> {
  const response = await authRequest('post', '/api/v1/notifications', accessToken)
    .send({
      title: 'Integration Notification',
      message: 'Created by integration tests',
      type: 'task-assigned',
      channels: ['in-app'],
      ...payload,
    })
    .expect(201);

  return { notificationId: response.body.data.id, response };
}
