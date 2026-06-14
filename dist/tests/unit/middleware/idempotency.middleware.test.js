"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const createMockRedis = () => {
    const store = new Map();
    const locks = new Set();
    const get = vitest_1.vi.fn(async (key) => store.get(key) ?? null);
    const set = vitest_1.vi.fn(async (key, value, options) => {
        if (options?.NX) {
            if (locks.has(key) || store.has(key))
                return null;
            locks.add(key);
        }
        else {
            store.set(key, value);
        }
        return 'OK';
    });
    const del = vitest_1.vi.fn(async (key) => {
        locks.delete(key);
        return store.delete(key) ? 1 : 0;
    });
    return { store, locks, get, set, del };
};
const createMockResponse = () => {
    const res = {
        statusCode: 200,
        headers: {},
        body: undefined,
        status(code) {
            this.statusCode = code;
            return this;
        },
        setHeader(name, value) {
            this.headers[name] = value;
            return this;
        },
        getHeaders() {
            return this.headers;
        },
        json(body) {
            this.body = body;
            this.headers['content-type'] = 'application/json';
            return this;
        },
        send(body) {
            this.body = body;
            return this;
        },
        on: vitest_1.vi.fn(),
        listeners: {},
    };
    res.on = vitest_1.vi.fn((event, handler) => {
        if (!res.listeners[event])
            res.listeners[event] = [];
        res.listeners[event].push(handler);
        return res;
    });
    return res;
};
(0, vitest_1.describe)('idempotency middleware', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.resetModules();
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.afterEach)(() => {
        vitest_1.vi.unstubAllEnvs();
    });
    const setupMocks = async (envOverrides) => {
        const redis = createMockRedis();
        vitest_1.vi.doMock('../../../config/redis', () => ({ redisClient: redis }));
        vitest_1.vi.stubEnv('IDEMPOTENCY_ENABLED', 'true');
        vitest_1.vi.stubEnv('IDEMPOTENCY_KEY_HEADER', 'Idempotency-Key');
        vitest_1.vi.stubEnv('IDEMPOTENCY_TTL_SECONDS', '86400');
        vitest_1.vi.stubEnv('IDEMPOTENCY_LOCK_TTL_SECONDS', '30');
        for (const [key, value] of Object.entries(envOverrides ?? {})) {
            vitest_1.vi.stubEnv(key, value);
        }
        const module = await Promise.resolve().then(() => __importStar(require('../../../middleware/idempotency.middleware')));
        return { middleware: module.idempotencyMiddleware, redis };
    };
    (0, vitest_1.it)('skips read-only methods', async () => {
        const { middleware } = await setupMocks();
        const req = { method: 'GET', body: {} };
        const res = createMockResponse();
        const next = vitest_1.vi.fn();
        await middleware(req, res, next);
        (0, vitest_1.expect)(next).toHaveBeenCalled();
    });
    (0, vitest_1.it)('skips requests without an idempotency key', async () => {
        const { middleware } = await setupMocks();
        const req = { method: 'POST', body: {}, get: () => undefined };
        const res = createMockResponse();
        const next = vitest_1.vi.fn();
        await middleware(req, res, next);
        (0, vitest_1.expect)(next).toHaveBeenCalled();
    });
    (0, vitest_1.it)('returns 400 for invalid idempotency key', async () => {
        const { middleware } = await setupMocks();
        const req = {
            method: 'POST',
            body: {},
            get: (name) => (name === 'Idempotency-Key' ? 'key with spaces!' : undefined),
            requestId: 'req-1',
        };
        const res = createMockResponse();
        const next = vitest_1.vi.fn();
        await middleware(req, res, next);
        (0, vitest_1.expect)(res.statusCode).toBe(400);
        (0, vitest_1.expect)(next).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)('caches successful responses and returns them on duplicate requests', async () => {
        const { middleware, redis } = await setupMocks();
        const key = 'idem-key-1';
        const body = { success: true, data: { id: '1' } };
        const req1 = {
            method: 'POST',
            originalUrl: '/api/v1/tasks',
            body: { title: 'Task' },
            get: (name) => (name === 'Idempotency-Key' ? key : undefined),
            requestId: 'req-1',
        };
        const res1 = createMockResponse();
        const next1 = vitest_1.vi.fn();
        await middleware(req1, res1, next1);
        (0, vitest_1.expect)(next1).toHaveBeenCalled();
        res1.status(201).json(body);
        res1.listeners.finish?.forEach((handler) => handler());
        (0, vitest_1.expect)(redis.store.size).toBe(1);
        const req2 = {
            method: 'POST',
            originalUrl: '/api/v1/tasks',
            body: { title: 'Task' },
            get: (name) => (name === 'Idempotency-Key' ? key : undefined),
            requestId: 'req-2',
        };
        const res2 = createMockResponse();
        const next2 = vitest_1.vi.fn();
        await middleware(req2, res2, next2);
        (0, vitest_1.expect)(next2).not.toHaveBeenCalled();
        (0, vitest_1.expect)(res2.statusCode).toBe(201);
        (0, vitest_1.expect)(res2.body).toEqual(JSON.stringify(body));
    });
    (0, vitest_1.it)('returns 409 when the same key is reused with a different request', async () => {
        const { middleware, redis } = await setupMocks();
        const key = 'idem-key-2';
        const body = { success: true, data: { id: '1' } };
        const req1 = {
            method: 'POST',
            originalUrl: '/api/v1/tasks',
            body: { title: 'Task A' },
            get: (name) => (name === 'Idempotency-Key' ? key : undefined),
            requestId: 'req-1',
        };
        const res1 = createMockResponse();
        const next1 = vitest_1.vi.fn();
        await middleware(req1, res1, next1);
        res1.status(201).json(body);
        res1.listeners.finish?.forEach((handler) => handler());
        const req2 = {
            method: 'POST',
            originalUrl: '/api/v1/tasks',
            body: { title: 'Task B' },
            get: (name) => (name === 'Idempotency-Key' ? key : undefined),
            requestId: 'req-2',
        };
        const res2 = createMockResponse();
        const next2 = vitest_1.vi.fn();
        await middleware(req2, res2, next2);
        (0, vitest_1.expect)(res2.statusCode).toBe(409);
        (0, vitest_1.expect)(next2).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)('does not cache non-2xx responses', async () => {
        const { middleware, redis } = await setupMocks();
        const key = 'idem-key-3';
        const req = {
            method: 'POST',
            originalUrl: '/api/v1/tasks',
            body: { title: 'Task' },
            get: (name) => (name === 'Idempotency-Key' ? key : undefined),
            requestId: 'req-1',
        };
        const res = createMockResponse();
        const next = vitest_1.vi.fn();
        await middleware(req, res, next);
        res.status(400).json({ success: false, message: 'Bad request' });
        res.listeners.finish?.forEach((handler) => handler());
        (0, vitest_1.expect)(redis.store.size).toBe(0);
    });
    (0, vitest_1.it)('is disabled when IDEMPOTENCY_ENABLED is false', async () => {
        const { middleware } = await setupMocks({ IDEMPOTENCY_ENABLED: 'false' });
        const req = {
            method: 'POST',
            body: {},
            get: (name) => (name === 'Idempotency-Key' ? 'key' : undefined),
        };
        const res = createMockResponse();
        const next = vitest_1.vi.fn();
        await middleware(req, res, next);
        (0, vitest_1.expect)(next).toHaveBeenCalled();
    });
});
//# sourceMappingURL=idempotency.middleware.test.js.map