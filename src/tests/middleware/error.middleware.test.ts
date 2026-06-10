import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { ZodError, z } from 'zod';
import { errorMiddleware } from '../../middleware/error.middleware';
import { notFoundMiddleware } from '../../middleware/notFound.middleware';
import { requestIdMiddleware } from '../../middleware/requestId.middleware';
import { roleMiddleware } from '../../middleware/role.middleware';
import { ApiError } from '../../utils/ApiError';
import * as envModule from '../../config/env';

const mockRequest = (overrides: Partial<Request> = {}): Request => {
  return {
    method: 'GET',
    originalUrl: '/test',
    url: '/test',
    ip: '127.0.0.1',
    headers: {},
    body: {},
    user: undefined,
    requestId: 'req-test-123',
    get: vi.fn(),
    ...overrides,
  } as unknown as Request;
};

const mockResponse = (): Response => {
  const res: Partial<Response> = {
    statusCode: 200,
    headersSent: false,
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
  };
  return res as Response;
};

const mockNext: NextFunction = vi.fn();

vi.mock('../../config/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

import { logger } from '../../config/logger';

describe('errorMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should handle ApiError operational and return status, message, details', () => {
    const req = mockRequest();
    const res = mockResponse();
    const error = new ApiError(StatusCodes.BAD_REQUEST, 'Bad input', { field: 'name' });

    errorMiddleware(error, req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Bad input',
        details: { field: 'name' },
        requestId: 'req-test-123',
      })
    );
  });

  it('should handle non-operational 500 in production and sanitize response', () => {
    const originalEnv = envModule.env.NODE_ENV;
    vi.spyOn(envModule.env, 'NODE_ENV', 'get').mockReturnValue('production');

    const req = mockRequest();
    const res = mockResponse();
    const error = new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'DB crashed', undefined, false);

    errorMiddleware(error, req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
    const jsonCall = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(jsonCall.message).toBe('Internal server error');
    expect(jsonCall.details).toBeUndefined();
    expect(jsonCall.stack).toBeUndefined();

    vi.spyOn(envModule.env, 'NODE_ENV', 'get').mockReturnValue(originalEnv);
  });

  it('should include stack trace in non-production for non-operational errors', () => {
    const originalEnv = envModule.env.NODE_ENV;
    vi.spyOn(envModule.env, 'NODE_ENV', 'get').mockReturnValue('development');

    const req = mockRequest();
    const res = mockResponse();
    const error = new Error('Something broke');

    errorMiddleware(error, req, res, mockNext);

    const jsonCall = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(jsonCall.stack).toBeDefined();
    expect(jsonCall.stack).toContain('Something broke');

    vi.spyOn(envModule.env, 'NODE_ENV', 'get').mockReturnValue(originalEnv);
  });

  it('should handle ZodError and return 400 with field errors', () => {
    const req = mockRequest();
    const res = mockResponse();
    const schema = z.object({ name: z.string() });
    const result = schema.safeParse({});
    if (result.success) throw new Error('Expected parse failure');
    const error = result.error;

    errorMiddleware(error, req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
    const jsonCall = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(jsonCall.message).toBe('Validation failed');
    expect(jsonCall.details).toBeDefined();
  });

  it('should handle Mongoose ValidationError', () => {
    const req = mockRequest();
    const res = mockResponse();
    const error = Object.assign(new Error('Path `email` is required.'), {
      name: 'ValidationError',
      errors: {
        email: { message: 'Path `email` is required.' },
      },
    });

    errorMiddleware(error, req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
    const jsonCall = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(jsonCall.message).toBe('Validation failed');
    expect(jsonCall.details).toEqual([{ field: 'email', message: 'Path `email` is required.' }]);
  });

  it('should handle Mongoose CastError', () => {
    const req = mockRequest();
    const res = mockResponse();
    const error = Object.assign(new Error('Cast to ObjectId failed'), {
      name: 'CastError',
      path: 'taskId',
      value: 'invalid-id',
    });

    errorMiddleware(error, req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
    const jsonCall = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(jsonCall.message).toBe('Invalid value for field');
    expect(jsonCall.details).toEqual({ field: 'taskId', value: 'invalid-id' });
  });

  it('should handle MongoDB duplicate key error', () => {
    const req = mockRequest();
    const res = mockResponse();
    const error = Object.assign(new Error('E11000 duplicate key error'), {
      name: 'MongoServerError',
      code: 11000,
      keyValue: { email: 'dup@example.com' },
    });

    errorMiddleware(error, req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.CONFLICT);
    const jsonCall = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(jsonCall.message).toBe('Duplicate field value');
    expect(jsonCall.details).toEqual({ email: 'dup@example.com' });
  });

  it('should handle JWT TokenExpiredError', () => {
    const req = mockRequest();
    const res = mockResponse();
    const error = Object.assign(new Error('jwt expired'), { name: 'TokenExpiredError' });

    errorMiddleware(error, req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
    const jsonCall = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(jsonCall.message).toBe('Token expired');
  });

  it('should handle JWT JsonWebTokenError', () => {
    const req = mockRequest();
    const res = mockResponse();
    const error = Object.assign(new Error('invalid token'), { name: 'JsonWebTokenError' });

    errorMiddleware(error, req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
    const jsonCall = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(jsonCall.message).toBe('Invalid token');
  });

  it('should handle SyntaxError from express.json()', () => {
    const req = mockRequest();
    const res = mockResponse();
    const error = Object.assign(new SyntaxError('Unexpected token'), { body: '{' });

    errorMiddleware(error, req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
    const jsonCall = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(jsonCall.message).toBe('Invalid JSON payload');
  });

  it('should return generic 500 for unknown errors in production', () => {
    const originalEnv = envModule.env.NODE_ENV;
    vi.spyOn(envModule.env, 'NODE_ENV', 'get').mockReturnValue('production');

    const req = mockRequest();
    const res = mockResponse();
    const error = new Error('Secret leak');

    errorMiddleware(error, req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
    const jsonCall = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(jsonCall.message).toBe('Internal server error');
    expect(jsonCall.stack).toBeUndefined();

    vi.spyOn(envModule.env, 'NODE_ENV', 'get').mockReturnValue(originalEnv);
  });

  it('should delegate to next(err) when headers already sent', () => {
    const req = mockRequest();
    const res = mockResponse();
    res.headersSent = true;
    const error = new Error('Late error');
    const next = vi.fn();

    expect(() => errorMiddleware(error, req, res, next)).not.toThrow();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(error);
  });

  it('should log with structured context including userId and redacted body', () => {
    const req = mockRequest({
      method: 'POST',
      originalUrl: '/api/v1/login',
      user: { id: 'user-42', email: 'a@example.com', role: 'member' },
      body: { email: 'a@example.com', password: 'secret123' },
    });
    const res = mockResponse();
    const error = ApiError.badRequest('Invalid credentials');

    errorMiddleware(error, req, res, mockNext);

    expect(logger.warn).toHaveBeenCalledWith(
      'Invalid credentials',
      expect.objectContaining({
        method: 'POST',
        url: '/api/v1/login',
        userId: 'user-42',
        requestId: 'req-test-123',
        body: expect.objectContaining({ password: '[REDACTED]' }),
      })
    );
  });

  it('should log 500 errors at error level', () => {
    const req = mockRequest();
    const res = mockResponse();
    const error = new Error('DB connection lost');

    errorMiddleware(error, req, res, mockNext);

    expect(logger.error).toHaveBeenCalledWith(
      'Internal server error',
      expect.objectContaining({
        errorName: 'Error',
        statusCode: 500,
        operational: false,
      })
    );
  });

  it('should handle MulterError and return 400 with code info', () => {
    const req = mockRequest();
    const res = mockResponse();
    const error = Object.assign(new Error('File too large'), {
      name: 'MulterError',
      code: 'LIMIT_FILE_SIZE',
      field: 'avatar',
    });

    errorMiddleware(error, req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
    const jsonCall = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(jsonCall.message).toBe('File too large');
    expect(jsonCall.details).toEqual({ code: 'LIMIT_FILE_SIZE', field: 'avatar' });
  });

  it('should log original details even when response is sanitized in production', () => {
    const originalEnv = envModule.env.NODE_ENV;
    vi.spyOn(envModule.env, 'NODE_ENV', 'get').mockReturnValue('production');

    const req = mockRequest();
    const res = mockResponse();
    const error = new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'DB query failed',
      { sql: 'SELECT * FROM users' },
      false
    );

    errorMiddleware(error, req, res, mockNext);

    // Response is sanitized
    const jsonCall = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(jsonCall.message).toBe('Internal server error');
    expect(jsonCall.details).toBeUndefined();

    // But log contains original details
    expect(logger.error).toHaveBeenCalledWith(
      'Internal server error',
      expect.objectContaining({
        originalMessage: 'DB query failed',
        details: { sql: 'SELECT * FROM users' },
      })
    );

    vi.spyOn(envModule.env, 'NODE_ENV', 'get').mockReturnValue(originalEnv);
  });

  it('should include err.cause in logs when present', () => {
    const req = mockRequest();
    const res = mockResponse();
    const cause = new Error('Root cause');
    const error = Object.assign(new Error('Wrapped error'), { cause });

    errorMiddleware(error, req, res, mockNext);

    expect(logger.error).toHaveBeenCalledWith(
      'Internal server error',
      expect.objectContaining({
        cause: expect.any(Error),
      })
    );
  });
});

describe('notFoundMiddleware', () => {
  it('should return 404 with route info', () => {
    const req = mockRequest({ method: 'GET', originalUrl: '/missing' });
    const res = mockResponse();

    notFoundMiddleware(req, res);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.NOT_FOUND);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Route GET /missing not found',
      requestId: 'req-test-123',
    });
  });

  it('should log 404s with structured context', () => {
    const req = mockRequest({
      method: 'POST',
      originalUrl: '/api/v1/unknown',
      path: '/api/v1/unknown',
      user: { id: 'user-99', email: 'a@example.com', role: 'member' },
    });
    const res = mockResponse();

    notFoundMiddleware(req, res);

    expect(logger.warn).toHaveBeenCalledWith(
      'Route POST /api/v1/unknown not found',
      expect.objectContaining({
        method: 'POST',
        url: '/api/v1/unknown',
        path: '/api/v1/unknown',
        requestId: 'req-test-123',
        ip: '127.0.0.1',
        userId: 'user-99',
      })
    );
  });
});

describe('requestIdMiddleware', () => {
  it('should set requestId from header if present', () => {
    const req = mockRequest();
    req.headers['x-request-id'] = 'client-id-abc';
    (req.get as ReturnType<typeof vi.fn>) = vi.fn(
      (name: string) => req.headers[name.toLowerCase()] as string | undefined
    );
    const res = mockResponse();
    const next = vi.fn();

    requestIdMiddleware(req, res, next);

    expect(req.requestId).toBe('client-id-abc');
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', 'client-id-abc');
    expect(next).toHaveBeenCalled();
  });

  it('should generate requestId if header missing', () => {
    const req = mockRequest();
    const res = mockResponse();
    const next = vi.fn();

    requestIdMiddleware(req, res, next);

    expect(req.requestId).toBeDefined();
    expect(typeof req.requestId).toBe('string');
    expect(req.requestId).not.toBe('req-test-123');
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', expect.any(String));
    expect(next).toHaveBeenCalled();
  });

  it('should trim whitespace from client requestId', () => {
    const req = mockRequest();
    req.headers['x-request-id'] = '  spaced-id  ';
    (req.get as ReturnType<typeof vi.fn>) = vi.fn(
      (name: string) => req.headers[name.toLowerCase()] as string | undefined
    );
    const res = mockResponse();
    const next = vi.fn();

    requestIdMiddleware(req, res, next);

    expect(req.requestId).toBe('spaced-id');
  });

  it('should use first value when multiple requestIds are sent', () => {
    const req = mockRequest();
    req.headers['x-request-id'] = 'first-id, second-id';
    (req.get as ReturnType<typeof vi.fn>) = vi.fn(
      (name: string) => req.headers[name.toLowerCase()] as string | undefined
    );
    const res = mockResponse();
    const next = vi.fn();

    requestIdMiddleware(req, res, next);

    expect(req.requestId).toBe('first-id');
  });

  it('should generate new UUID for overly long requestId', () => {
    const req = mockRequest();
    req.headers['x-request-id'] = 'a'.repeat(300);
    (req.get as ReturnType<typeof vi.fn>) = vi.fn(
      (name: string) => req.headers[name.toLowerCase()] as string | undefined
    );
    const res = mockResponse();
    const next = vi.fn();

    requestIdMiddleware(req, res, next);

    expect(req.requestId).not.toBe('a'.repeat(300));
    expect(typeof req.requestId).toBe('string');
  });

  it('should generate new UUID for requestId with invalid characters', () => {
    const req = mockRequest();
    req.headers['x-request-id'] = 'id<script>alert(1)</script>';
    (req.get as ReturnType<typeof vi.fn>) = vi.fn(
      (name: string) => req.headers[name.toLowerCase()] as string | undefined
    );
    const res = mockResponse();
    const next = vi.fn();

    requestIdMiddleware(req, res, next);

    expect(req.requestId).not.toContain('<script>');
    expect(typeof req.requestId).toBe('string');
  });

  it('should generate new UUID for empty string requestId', () => {
    const req = mockRequest();
    req.headers['x-request-id'] = '';
    (req.get as ReturnType<typeof vi.fn>) = vi.fn(
      (name: string) => req.headers[name.toLowerCase()] as string | undefined
    );
    const res = mockResponse();
    const next = vi.fn();

    requestIdMiddleware(req, res, next);

    expect(req.requestId).toBeDefined();
    expect(req.requestId).not.toBe('');
  });
});

describe('roleMiddleware', () => {
  it('should allow access when user has required role', () => {
    const req = mockRequest({
      user: { id: 'user-1', email: 'a@example.com', role: 'admin' },
    });
    const res = mockResponse();
    const next = vi.fn();

    roleMiddleware('admin', 'owner')(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('should deny access when user role is not in allowed list', () => {
    const req = mockRequest({
      user: { id: 'user-2', email: 'b@example.com', role: 'member' },
    });
    const res = mockResponse();
    const next = vi.fn();

    roleMiddleware('admin')(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = (next as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(error).toBeInstanceOf(ApiError);
    expect(error.statusCode).toBe(403);
    expect(error.details).toEqual({ requiredRoles: ['admin'], actualRole: 'member' });
    expect(logger.warn).toHaveBeenCalledWith(
      'Access denied: insufficient role',
      expect.objectContaining({
        userId: 'user-2',
        actualRole: 'member',
        requiredRoles: ['admin'],
      })
    );
  });

  it('should deny access when user is not authenticated', () => {
    const req = mockRequest();
    const res = mockResponse();
    const next = vi.fn();

    roleMiddleware('admin')(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = (next as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(error).toBeInstanceOf(ApiError);
    expect(error.statusCode).toBe(403);
    expect(error.details).toEqual({ requiredRoles: ['admin'], actualRole: undefined });
  });

  it('should allow access when user has any of the allowed roles', () => {
    const req = mockRequest({
      user: { id: 'user-3', email: 'c@example.com', role: 'manager' },
    });
    const res = mockResponse();
    const next = vi.fn();

    roleMiddleware('admin', 'manager', 'owner')(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });
});
