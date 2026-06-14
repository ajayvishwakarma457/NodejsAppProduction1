import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { rateLimitMiddleware } from '../../../middleware/rateLimit.middleware';
import * as envModule from '../../../config/env';

const mockRequest = (overrides: Partial<Request> = {}): Request => {
  return {
    method: 'GET',
    originalUrl: '/api/v1/test',
    url: '/api/v1/test',
    path: '/api/v1/test',
    ip: '127.0.0.1',
    headers: {},
    body: {},
    user: undefined,
    requestId: 'req-test-456',
    get: vi.fn(),
    ...overrides,
  } as unknown as Request;
};

const mockResponse = (): Response => {
  const headers: Record<string, string> = {};
  const res: Partial<Response> = {
    statusCode: 200,
    headersSent: false,
    setHeader: vi.fn((name: string, value: string) => {
      headers[name] = value;
      return res as Response;
    }),
    getHeader: vi.fn((name: string) => headers[name]),
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res as Response;
};

vi.mock('../../../config/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../../config/redis', () => ({
  redisClient: {
    incr: vi.fn(),
    expire: vi.fn(),
    ttl: vi.fn(),
  },
}));

import { logger } from '../../../config/logger';
import { redisClient } from '../../../config/redis';

describe('rateLimitMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should skip when rate limiting is disabled', async () => {
    vi.spyOn(envModule.env, 'RATE_LIMIT_ENABLED', 'get').mockReturnValue(false);
    const req = mockRequest();
    const res = mockResponse();
    const next = vi.fn();

    await rateLimitMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(redisClient.incr).not.toHaveBeenCalled();
  });

  it('should skip health endpoint', async () => {
    vi.spyOn(envModule.env, 'RATE_LIMIT_ENABLED', 'get').mockReturnValue(true);
    const req = mockRequest({ path: '/health', originalUrl: '/health', url: '/health' });
    const res = mockResponse();
    const next = vi.fn();

    await rateLimitMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(redisClient.incr).not.toHaveBeenCalled();
  });

  it('should allow request when under limit for anonymous users', async () => {
    vi.spyOn(envModule.env, 'RATE_LIMIT_ENABLED', 'get').mockReturnValue(true);
    vi.spyOn(envModule.env, 'APP_NAME', 'get').mockReturnValue('TestApp');
    vi.spyOn(envModule.env, 'RATE_LIMIT_WINDOW_MS', 'get').mockReturnValue(60000);
    vi.spyOn(envModule.env, 'RATE_LIMIT_MAX_REQUESTS', 'get').mockReturnValue(5);

    (redisClient.incr as ReturnType<typeof vi.fn>).mockResolvedValue(1);
    (redisClient.expire as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (redisClient.ttl as ReturnType<typeof vi.fn>).mockResolvedValue(60);

    const req = mockRequest();
    const res = mockResponse();
    const next = vi.fn();

    await rateLimitMiddleware(req, res, next);

    expect(redisClient.incr).toHaveBeenCalledWith('TestApp:ratelimit:ip:127.0.0.1');
    expect(redisClient.expire).toHaveBeenCalledWith('TestApp:ratelimit:ip:127.0.0.1', 60);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '5');
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '4');
    expect(next).toHaveBeenCalled();
  });

  it('should allow request when under limit for authenticated users', async () => {
    vi.spyOn(envModule.env, 'RATE_LIMIT_ENABLED', 'get').mockReturnValue(true);
    vi.spyOn(envModule.env, 'APP_NAME', 'get').mockReturnValue('TestApp');
    vi.spyOn(envModule.env, 'RATE_LIMIT_AUTHENTICATED_MAX_REQUESTS', 'get').mockReturnValue(10);

    (redisClient.incr as ReturnType<typeof vi.fn>).mockResolvedValue(3);
    (redisClient.ttl as ReturnType<typeof vi.fn>).mockResolvedValue(45);

    const req = mockRequest({ user: { id: 'user-1', email: 'a@example.com', role: 'member' } });
    const res = mockResponse();
    const next = vi.fn();

    await rateLimitMiddleware(req, res, next);

    expect(redisClient.incr).toHaveBeenCalledWith('TestApp:ratelimit:user:user-1');
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '10');
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '7');
    expect(next).toHaveBeenCalled();
  });

  it('should block request when over limit and return 429', async () => {
    vi.spyOn(envModule.env, 'RATE_LIMIT_ENABLED', 'get').mockReturnValue(true);
    vi.spyOn(envModule.env, 'RATE_LIMIT_MAX_REQUESTS', 'get').mockReturnValue(5);

    (redisClient.incr as ReturnType<typeof vi.fn>).mockResolvedValue(6);
    (redisClient.ttl as ReturnType<typeof vi.fn>).mockResolvedValue(30);

    const req = mockRequest();
    const res = mockResponse();
    const next = vi.fn();

    await rateLimitMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.TOO_MANY_REQUESTS);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Too many requests, please try again later',
      })
    );
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '30');
    expect(next).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      'Rate limit exceeded',
      expect.objectContaining({
        identifier: '127.0.0.1',
        type: 'ip',
        count: 6,
      })
    );
  });

  it('should set X-RateLimit-Reset header', async () => {
    vi.spyOn(envModule.env, 'RATE_LIMIT_ENABLED', 'get').mockReturnValue(true);

    (redisClient.incr as ReturnType<typeof vi.fn>).mockResolvedValue(2);
    (redisClient.ttl as ReturnType<typeof vi.fn>).mockResolvedValue(55);

    const req = mockRequest();
    const res = mockResponse();
    const next = vi.fn();

    await rateLimitMiddleware(req, res, next);

    const before = Math.ceil(Date.now() / 1000);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String));
    const resetCall = (res.setHeader as ReturnType<typeof vi.fn>).mock.calls.find(
      (call) => call[0] === 'X-RateLimit-Reset'
    );
    const resetValue = parseInt(resetCall![1], 10);
    const after = Math.ceil(Date.now() / 1000) + 60;
    expect(resetValue).toBeGreaterThanOrEqual(before + 55);
    expect(resetValue).toBeLessThanOrEqual(after);
  });

  it('should set draft-7 RateLimit headers', async () => {
    vi.spyOn(envModule.env, 'RATE_LIMIT_ENABLED', 'get').mockReturnValue(true);
    vi.spyOn(envModule.env, 'RATE_LIMIT_MAX_REQUESTS', 'get').mockReturnValue(5);

    (redisClient.incr as ReturnType<typeof vi.fn>).mockResolvedValue(3);
    (redisClient.ttl as ReturnType<typeof vi.fn>).mockResolvedValue(45);

    const req = mockRequest();
    const res = mockResponse();
    const next = vi.fn();

    await rateLimitMiddleware(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith('RateLimit-Limit', '5');
    expect(res.setHeader).toHaveBeenCalledWith('RateLimit-Remaining', '2');
    expect(res.setHeader).toHaveBeenCalledWith('RateLimit-Reset', expect.any(String));
  });

  it('should fail open when Redis is unavailable', async () => {
    vi.spyOn(envModule.env, 'RATE_LIMIT_ENABLED', 'get').mockReturnValue(true);

    (redisClient.incr as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Redis connection lost')
    );

    const req = mockRequest();
    const res = mockResponse();
    const next = vi.fn();

    await rateLimitMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      'Rate limiting check failed, allowing request',
      expect.objectContaining({ error: 'Redis connection lost' })
    );
  });

  it('should not call expire after the first increment on subsequent requests', async () => {
    vi.spyOn(envModule.env, 'RATE_LIMIT_ENABLED', 'get').mockReturnValue(true);

    (redisClient.incr as ReturnType<typeof vi.fn>).mockResolvedValue(2);
    (redisClient.ttl as ReturnType<typeof vi.fn>).mockResolvedValue(50);

    const req = mockRequest();
    const res = mockResponse();
    const next = vi.fn();

    await rateLimitMiddleware(req, res, next);

    expect(redisClient.expire).not.toHaveBeenCalled();
  });

  it('should fallback to window seconds when TTL read fails', async () => {
    vi.spyOn(envModule.env, 'RATE_LIMIT_ENABLED', 'get').mockReturnValue(true);
    vi.spyOn(envModule.env, 'RATE_LIMIT_WINDOW_MS', 'get').mockReturnValue(60000);

    (redisClient.incr as ReturnType<typeof vi.fn>).mockResolvedValue(1);
    (redisClient.expire as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (redisClient.ttl as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('TTL error'));

    const req = mockRequest();
    const res = mockResponse();
    const next = vi.fn();

    await rateLimitMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    const resetCall = (res.setHeader as ReturnType<typeof vi.fn>).mock.calls.find(
      (call) => call[0] === 'X-RateLimit-Reset'
    );
    const resetValue = parseInt(resetCall![1], 10);
    expect(resetValue).toBeGreaterThan(Math.ceil(Date.now() / 1000));
  });
});
