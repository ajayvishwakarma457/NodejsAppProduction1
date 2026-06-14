"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.test = void 0;
exports.cleanupDatabase = cleanupDatabase;
exports.disconnectDatabase = disconnectDatabase;
exports.registerUser = registerUser;
exports.loginUser = loginUser;
exports.createAdminUser = createAdminUser;
exports.createTeam = createTeam;
exports.createProject = createProject;
exports.createTask = createTask;
exports.createNotification = createNotification;
const test_1 = require("@playwright/test");
const mongoose_1 = __importDefault(require("mongoose"));
const TEST_MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/nodejs-app-production1-e2e-test';
/**
 * Drop all MongoDB collections used by the application so each E2E test
 * starts from a clean slate. Redis is flushed automatically by the server
 * when it starts in the test environment.
 */
async function cleanupDatabase() {
    if (mongoose_1.default.connection.readyState === 0) {
        await mongoose_1.default.connect(TEST_MONGODB_URI);
    }
    const collections = await mongoose_1.default.connection.db.collections();
    await Promise.all(collections.map((collection) => collection.deleteMany({}).catch(() => undefined)));
}
async function disconnectDatabase() {
    if (mongoose_1.default.connection.readyState !== 0) {
        await mongoose_1.default.disconnect();
    }
}
/**
 * Register a new user and return the created user plus tokens.
 */
async function registerUser(request, email, password = 'Password123!') {
    const response = await request.post('/api/v1/auth/register', {
        data: {
            firstName: 'E2E',
            lastName: 'User',
            email,
            password,
            confirmPassword: password,
        },
    });
    (0, test_1.expect)(response.ok()).toBeTruthy();
    const body = await response.json();
    (0, test_1.expect)(body.success).toBe(true);
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
async function loginUser(request, email, password = 'Password123!') {
    const response = await request.post('/api/v1/auth/login', {
        data: { email, password },
    });
    (0, test_1.expect)(response.ok()).toBeTruthy();
    const body = await response.json();
    (0, test_1.expect)(body.success).toBe(true);
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
async function createAdminUser(request, email) {
    // Register a normal user first, then promote to admin by manipulating the DB.
    const user = await registerUser(request, email);
    if (mongoose_1.default.connection.readyState === 0) {
        await mongoose_1.default.connect(TEST_MONGODB_URI);
    }
    await mongoose_1.default.connection
        .db.collection('users')
        .updateOne({ _id: new mongoose_1.default.Types.ObjectId(user.id) }, { $set: { role: 'admin' } });
    // Re-login to get a fresh token with the admin role.
    return loginUser(request, email);
}
/**
 * Create a team for the authenticated user.
 */
async function createTeam(request, accessToken, name = 'E2E Team') {
    const response = await request.post('/api/v1/teams', {
        headers: { Authorization: `Bearer ${accessToken}` },
        data: { name, description: 'Created by Playwright' },
    });
    (0, test_1.expect)(response.ok()).toBeTruthy();
    const body = await response.json();
    (0, test_1.expect)(body.success).toBe(true);
    return { id: body.data.id, name: body.data.name };
}
/**
 * Create a project under a team.
 */
async function createProject(request, accessToken, teamId, name = 'E2E Project') {
    const response = await request.post('/api/v1/projects', {
        headers: { Authorization: `Bearer ${accessToken}` },
        data: { name, description: 'Created by Playwright', teamId },
    });
    (0, test_1.expect)(response.ok()).toBeTruthy();
    const body = await response.json();
    (0, test_1.expect)(body.success).toBe(true);
    return { id: body.data.id, name: body.data.name };
}
/**
 * Create a task under a project.
 */
async function createTask(request, accessToken, projectId, assignedTo, title = 'E2E Task') {
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
    (0, test_1.expect)(response.ok()).toBeTruthy();
    const body = await response.json();
    (0, test_1.expect)(body.success).toBe(true);
    return { id: body.data.id, title: body.data.title };
}
/**
 * Create a notification for a target user.
 */
async function createNotification(request, accessToken, userId, title = 'E2E Notification') {
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
    (0, test_1.expect)(response.ok()).toBeTruthy();
    const body = await response.json();
    (0, test_1.expect)(body.success).toBe(true);
    return { id: body.data.id, title: body.data.title };
}
exports.test = test_1.test.extend({
    authUser: async ({ request }, use) => {
        const user = await registerUser(request, `e2e-user-${Date.now()}@example.com`);
        await use(user);
    },
    adminUser: async ({ request }, use) => {
        const user = await createAdminUser(request, `e2e-admin-${Date.now()}@example.com`);
        await use(user);
    },
});
//# sourceMappingURL=fixtures.js.map