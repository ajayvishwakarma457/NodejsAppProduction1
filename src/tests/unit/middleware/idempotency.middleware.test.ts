import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

const createMockRedis = () => {
  const store = new Map<string, string>();
  const locks = new Set<string>();

  const get = vi.fn(async (key: string) => store.get(key) ?? null);
  const set = vi.fn(async (key: string, value: string, options?: { NX?: boolean; EX?: number }) => {
    if (options?.NX) {
      if (locks.has(key) || store.has(key)) return null;
      locks.add(key);
    } else {
      store.set(key, value);
    }
    return 'OK';
  });
  const del = vi.fn(async (key: string) => {
    locks.delete(key);
    return store.delete(key) ? 1 : 0;
  });

  return { store, locks, get, set, del };
};

const createMockResponse = () => {
  const res = {
    statusCode: 200,
    headers: {} as Record<string, string | number | string[]>,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    setHeader(name: string, value: string | number | string[]) {
      this.headers[name] = value;
      return this;
    },
    getHeaders() {
      return this.headers;
    },
    json(body: unknown) {
      this.body = body;
      this.headers['content-type'] = 'application/json';
      return this;
    },
    send(body: unknown) {
      this.body = body;
      return this;
    },
    on: vi.fn(),
    listeners: {} as Record<string, (() => void)[]>,
  };

  res.on = vi.fn((event: string, handler: () => void) => {
    if (!res.listeners[event]) res.listeners[event] = [];
    res.listeners[event].push(handler);
    return res;
  });

  return res as unknown as Response & {
    body: unknown;
    listeners: Record<string, (() => void)[]>;
  };
};

describe('idempotency middleware', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const setupMocks = async (envOverrides?: Record<string, string>) => {
    const redis = createMockRedis();

    vi.doMock('../../../config/redis', () => ({ redisClient: redis }));

    vi.stubEnv('IDEMPOTENCY_ENABLED', 'true');
    vi.stubEnv('IDEMPOTENCY_KEY_HEADER', 'Idempotency-Key');
    vi.stubEnv('IDEMPOTENCY_TTL_SECONDS', '86400');
    vi.stubEnv('IDEMPOTENCY_LOCK_TTL_SECONDS', '30');

    for (const [key, value] of Object.entries(envOverrides ?? {})) {
      vi.stubEnv(key, value);
    }

    const module = await import('../../../middleware/idempotency.middleware');
    return { middleware: module.idempotencyMiddleware, redis };
  };

  it('skips read-only methods', async () => {
    const { middleware } = await setupMocks();
    const req = { method: 'GET', body: {} } as Request;
    const res = createMockResponse();
    const next = vi.fn();

    await middleware(req, res as Response, next);

    expect(next).toHaveBeenCalled();
  });

  it('skips requests without an idempotency key', async () => {
    const { middleware } = await setupMocks();
    const req = { method: 'POST', body: {}, get: () => undefined } as unknown as Request;
    const res = createMockResponse();
    const next = vi.fn();

    await middleware(req, res as Response, next);

    expect(next).toHaveBeenCalled();
  });

  it('returns 400 for invalid idempotency key', async () => {
    const { middleware } = await setupMocks();
    const req = {
      method: 'POST',
      body: {},
      get: (name: string) => (name === 'Idempotency-Key' ? 'key with spaces!' : undefined),
      requestId: 'req-1',
    } as unknown as Request;
    const res = createMockResponse();
    const next = vi.fn();

    await middleware(req, res as Response, next);

    expect(res.statusCode).toBe(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('caches successful responses and returns them on duplicate requests', async () => {
    const { middleware, redis } = await setupMocks();
    const key = 'idem-key-1';
    const body = { success: true, data: { id: '1' } };

    const req1 = {
      method: 'POST',
      originalUrl: '/api/v1/tasks',
      body: { title: 'Task' },
      get: (name: string) => (name === 'Idempotency-Key' ? key : undefined),
      requestId: 'req-1',
    } as unknown as Request;
    const res1 = createMockResponse();
    const next1 = vi.fn();

    await middleware(req1, res1 as Response, next1);
    expect(next1).toHaveBeenCalled();

    res1.status(201).json(body);
    res1.listeners.finish?.forEach((handler) => handler());

    expect(redis.store.size).toBe(1);

    const req2 = {
      method: 'POST',
      originalUrl: '/api/v1/tasks',
      body: { title: 'Task' },
      get: (name: string) => (name === 'Idempotency-Key' ? key : undefined),
      requestId: 'req-2',
    } as unknown as Request;
    const res2 = createMockResponse();
    const next2 = vi.fn();

    await middleware(req2, res2 as Response, next2);

    expect(next2).not.toHaveBeenCalled();
    expect(res2.statusCode).toBe(201);
    expect(res2.body).toEqual(JSON.stringify(body));
  });

  it('returns 409 when the same key is reused with a different request', async () => {
    const { middleware, redis } = await setupMocks();
    const key = 'idem-key-2';
    const body = { success: true, data: { id: '1' } };

    const req1 = {
      method: 'POST',
      originalUrl: '/api/v1/tasks',
      body: { title: 'Task A' },
      get: (name: string) => (name === 'Idempotency-Key' ? key : undefined),
      requestId: 'req-1',
    } as unknown as Request;
    const res1 = createMockResponse();
    const next1 = vi.fn();

    await middleware(req1, res1 as Response, next1);
    res1.status(201).json(body);
    res1.listeners.finish?.forEach((handler) => handler());

    const req2 = {
      method: 'POST',
      originalUrl: '/api/v1/tasks',
      body: { title: 'Task B' },
      get: (name: string) => (name === 'Idempotency-Key' ? key : undefined),
      requestId: 'req-2',
    } as unknown as Request;
    const res2 = createMockResponse();
    const next2 = vi.fn();

    await middleware(req2, res2 as Response, next2);

    expect(res2.statusCode).toBe(409);
    expect(next2).not.toHaveBeenCalled();
  });

  it('does not cache non-2xx responses', async () => {
    const { middleware, redis } = await setupMocks();
    const key = 'idem-key-3';

    const req = {
      method: 'POST',
      originalUrl: '/api/v1/tasks',
      body: { title: 'Task' },
      get: (name: string) => (name === 'Idempotency-Key' ? key : undefined),
      requestId: 'req-1',
    } as unknown as Request;
    const res = createMockResponse();
    const next = vi.fn();

    await middleware(req, res as Response, next);
    res.status(400).json({ success: false, message: 'Bad request' });
    res.listeners.finish?.forEach((handler) => handler());

    expect(redis.store.size).toBe(0);
  });

  it('is disabled when IDEMPOTENCY_ENABLED is false', async () => {
    const { middleware } = await setupMocks({ IDEMPOTENCY_ENABLED: 'false' });
    const req = {
      method: 'POST',
      body: {},
      get: (name: string) => (name === 'Idempotency-Key' ? 'key' : undefined),
    } as unknown as Request;
    const res = createMockResponse();
    const next = vi.fn();

    await middleware(req, res as Response, next);

    expect(next).toHaveBeenCalled();
  });
});
