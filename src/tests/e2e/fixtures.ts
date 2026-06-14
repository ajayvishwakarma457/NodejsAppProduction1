import { test as base, expect, APIRequestContext } from '@playwright/test';
import mongoose from 'mongoose';

export interface TestUser {
  id: string;
  email: string;
  password: string;
  accessToken: string;
  refreshToken: string;
}

export interface TestTeam {
  id: string;
  name: string;
}

export interface TestProject {
  id: string;
  name: string;
}

export interface TestTask {
  id: string;
  title: string;
}

export interface TestNotification {
  id: string;
  title: string;
}

const TEST_MONGODB_URI =
  process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/nodejs-app-production1-e2e-test';

/**
 * Drop all MongoDB collections used by the application so each E2E test
 * starts from a clean slate. Redis is flushed automatically by the server
 * when it starts in the test environment.
 */
export async function cleanupDatabase(): Promise<void> {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_MONGODB_URI);
  }

  const collections = await mongoose.connection.db!.collections();
  await Promise.all(
    collections.map((collection) => collection.deleteMany({}).catch(() => undefined))
  );
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

/**
 * Register a new user and return the created user plus tokens.
 */
export async function registerUser(
  request: APIRequestContext,
  email: string,
  password = 'Password123!'
): Promise<TestUser> {
  const response = await request.post('/api/v1/auth/register', {
    data: {
      firstName: 'E2E',
      lastName: 'User',
      email,
      password,
      confirmPassword: password,
    },
  });

  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.success).toBe(true);

  return {
    id: body.data.user.id,
    email,
    password,
    accessToken: body.data.tokens.accessToken,
    refreshToken: body.data.tokens.refreshToken,
  };
}

/**
 * Login an existing user and return tokens.
 */
export async function loginUser(
  request: APIRequestContext,
  email: string,
  password = 'Password123!'
): Promise<TestUser> {
  const response = await request.post('/api/v1/auth/login', {
    data: { email, password },
  });

  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.success).toBe(true);

  return {
    id: body.data.user.id,
    email,
    password,
    accessToken: body.data.tokens.accessToken,
    refreshToken: body.data.tokens.refreshToken,
  };
}

/**
 * Create an admin user directly for tests that need elevated privileges.
 */
export async function createAdminUser(
  request: APIRequestContext,
  email: string
): Promise<TestUser> {
  // Register a normal user first, then promote to admin by manipulating the DB.
  const user = await registerUser(request, email);

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_MONGODB_URI);
  }

  await mongoose.connection
    .db!.collection('users')
    .updateOne({ _id: new mongoose.Types.ObjectId(user.id) }, { $set: { role: 'admin' } });

  // Re-login to get a fresh token with the admin role.
  return loginUser(request, email);
}

/**
 * Create a team for the authenticated user.
 */
export async function createTeam(
  request: APIRequestContext,
  accessToken: string,
  name = 'E2E Team'
): Promise<TestTeam> {
  const response = await request.post('/api/v1/teams', {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: { name, description: 'Created by Playwright' },
  });

  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.success).toBe(true);

  return { id: body.data.id, name: body.data.name };
}

/**
 * Create a project under a team.
 */
export async function createProject(
  request: APIRequestContext,
  accessToken: string,
  teamId: string,
  name = 'E2E Project'
): Promise<TestProject> {
  const response = await request.post('/api/v1/projects', {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: { name, description: 'Created by Playwright', teamId },
  });

  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.success).toBe(true);

  return { id: body.data.id, name: body.data.name };
}

/**
 * Create a task under a project.
 */
export async function createTask(
  request: APIRequestContext,
  accessToken: string,
  projectId: string,
  assignedTo: string,
  title = 'E2E Task'
): Promise<TestTask> {
  const response = await request.post('/api/v1/tasks', {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: {
      title,
      description: 'Created by Playwright',
      projectId,
      assignedTo,
      priority: 'high',
    },
  });

  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.success).toBe(true);

  return { id: body.data.id, title: body.data.title };
}

/**
 * Create a notification for a target user.
 */
export async function createNotification(
  request: APIRequestContext,
  accessToken: string,
  userId: string,
  title = 'E2E Notification'
): Promise<TestNotification> {
  const response = await request.post('/api/v1/notifications', {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: {
      userId,
      title,
      message: 'Created by Playwright',
      type: 'mention',
      channels: ['in-app'],
    },
  });

  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.success).toBe(true);

  return { id: body.data.id, title: body.data.title };
}

export const test = base.extend<{
  authUser: TestUser;
  adminUser: TestUser;
}>({
  authUser: async ({ request }, use) => {
    const user = await registerUser(request, `e2e-user-${Date.now()}@example.com`);
    await use(user);
  },
  adminUser: async ({ request }, use) => {
    const user = await createAdminUser(request, `e2e-admin-${Date.now()}@example.com`);
    await use(user);
  },
});
