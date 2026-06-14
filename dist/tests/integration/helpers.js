"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminUser = exports.defaultUser = exports.api = void 0;
exports.register = register;
exports.login = login;
exports.authenticatedAgent = authenticatedAgent;
exports.authRequest = authRequest;
exports.cleanupCollections = cleanupCollections;
exports.cleanupRedis = cleanupRedis;
exports.createAdminUser = createAdminUser;
exports.createTeam = createTeam;
exports.createProject = createProject;
exports.createTask = createTask;
exports.createComment = createComment;
exports.createNotification = createNotification;
const supertest_1 = __importDefault(require("supertest"));
const mongoose_1 = __importDefault(require("mongoose"));
const app_1 = require("../../app");
const redis_1 = require("../../config/redis");
const user_model_1 = require("../../modules/users/user.model");
/**
 * Integration test helpers.
 *
 * Provides convenience functions for building HTTP requests, creating
 * authenticated sessions, and cleaning up test data between runs.
 */
exports.api = (0, supertest_1.default)(app_1.app);
exports.defaultUser = {
    firstName: 'Integration',
    lastName: 'Test',
    email: 'integration-test@example.com',
    password: 'Password123!',
};
exports.adminUser = {
    firstName: 'Admin',
    lastName: 'Test',
    email: 'admin-test@example.com',
    password: 'Password123!',
};
/**
 * Register a new user and return the resulting auth session.
 * If no payload is provided, the default test user is used.
 */
async function register(payload = {}) {
    const response = await exports.api
        .post('/api/v1/auth/register')
        .send({ ...exports.defaultUser, ...payload })
        .expect(201);
    const session = {
        userId: response.body.data.user.id,
        accessToken: response.body.data.tokens.accessToken,
        refreshToken: response.body.data.tokens.refreshToken,
    };
    return { session, response };
}
/**
 * Log in an existing user and return a fresh auth session.
 */
async function login(email, password) {
    const response = await exports.api.post('/api/v1/auth/login').send({ email, password }).expect(200);
    return {
        userId: response.body.data.user.id,
        accessToken: response.body.data.tokens.accessToken,
        refreshToken: response.body.data.tokens.refreshToken,
    };
}
/**
 * Create an authenticated Supertest agent pre-configured with a Bearer token.
 */
function authenticatedAgent(accessToken) {
    return (0, supertest_1.default)(app_1.app).set('Authorization', `Bearer ${accessToken}`);
}
/**
 * Helper to send an authenticated request in a single call.
 */
function authRequest(method, path, accessToken) {
    return exports.api[method](path).set('Authorization', `Bearer ${accessToken}`);
}
/**
 * Delete all documents from every MongoDB collection.
 */
async function cleanupCollections() {
    if (mongoose_1.default.connection.readyState === 0)
        return;
    const collections = mongoose_1.default.connection.collections;
    await Promise.all(Object.values(collections).map(async (collection) => {
        try {
            await collection.deleteMany({});
        }
        catch {
            // Ignore errors from capped/system collections that cannot be cleared.
        }
    }));
}
/**
 * Delete all Redis keys matching the application prefix.
 */
async function cleanupRedis() {
    if (!redis_1.redisClient.isOpen)
        return;
    await redis_1.redisClient.flushDb();
}
/**
 * Create a user with admin role directly in the database and return an
 * authenticated session. Useful for testing admin-only endpoints.
 */
async function createAdminUser(payload = {}) {
    const merged = { ...exports.adminUser, ...payload };
    await user_model_1.UserModel.create({
        ...merged,
        role: 'admin',
        isVerified: true,
    });
    return login(merged.email, merged.password);
}
async function createTeam(accessToken, payload = {}) {
    const response = await authRequest('post', '/api/v1/teams', accessToken)
        .send({
        name: 'Integration Team',
        description: 'Created by integration tests',
        ...payload,
    })
        .expect(201);
    return { teamId: response.body.data.id, response };
}
async function createProject(accessToken, payload = {}) {
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
async function createTask(accessToken, payload = {}) {
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
async function createComment(accessToken, payload = {}) {
    const response = await authRequest('post', '/api/v1/comments', accessToken)
        .send({
        content: 'Integration test comment',
        ...payload,
    })
        .expect(201);
    return { commentId: response.body.data.id, response };
}
async function createNotification(accessToken, payload = {}) {
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
//# sourceMappingURL=helpers.js.map