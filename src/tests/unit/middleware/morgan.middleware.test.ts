import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

const createMorganMock = () => {
  const tokenMock = vi.fn();
  const formatMock = vi.fn();
  const morganFn = vi.fn().mockReturnValue(() => {});

  const morganMock = Object.assign(morganFn, {
    token: tokenMock,
    format: formatMock,
  });

  return { morganMock, tokenMock, formatMock };
};

const invokeMiddleware = (
  middleware: (req: Request, res: Response, next: NextFunction) => unknown,
  morganMock: ReturnType<typeof createMorganMock>['morganMock'],
  statusCode = 200
) => {
  const next = vi.fn();
  const req = { path: '/api/v1/users' } as Request;
  const res = { statusCode } as Response;

  middleware(req, res, next);

  return { options: morganMock.mock.calls[0][1], req, res, next };
};

describe('morgan middleware', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.doUnmock('morgan');
    vi.doUnmock('../../../config/logger');
  });

  const setupMocks = async (envOverrides?: Record<string, string>) => {
    const { morganMock, tokenMock, formatMock } = createMorganMock();
    const loggerInfoMock = vi.fn();
    const loggerWarnMock = vi.fn();
    const loggerErrorMock = vi.fn();
    const loggerDebugMock = vi.fn();

    vi.doMock('morgan', () => ({ default: morganMock, ...morganMock }));
    vi.doMock('../../../config/logger', () => ({
      logger: {
        debug: loggerDebugMock,
        info: loggerInfoMock,
        warn: loggerWarnMock,
        error: loggerErrorMock,
      },
    }));

    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('HTTP_LOGGER', 'morgan');
    vi.stubEnv('MORGAN_FORMAT', 'combined');
    vi.stubEnv('MORGAN_SKIP_HEALTH_CHECK', 'true');
    vi.stubEnv('MORGAN_IMMEDIATE', 'false');

    for (const [key, value] of Object.entries(envOverrides ?? {})) {
      vi.stubEnv(key, value);
    }

    const module = await import('../../../middleware/morgan.middleware');

    return {
      morganMock,
      tokenMock,
      formatMock,
      loggerInfoMock,
      loggerWarnMock,
      loggerErrorMock,
      loggerDebugMock,
      middleware: module.morganMiddleware,
    };
  };

  it('registers custom requestId and userId tokens', async () => {
    const { tokenMock } = await setupMocks();

    expect(tokenMock).toHaveBeenCalledWith('requestId', expect.any(Function));
    expect(tokenMock).toHaveBeenCalledWith('userId', expect.any(Function));
  });

  it('registers a structured json format', async () => {
    const { formatMock } = await setupMocks();

    expect(formatMock).toHaveBeenCalledWith('json', expect.any(Function));
  });

  it('configures morgan with the configured format, stream, skip and immediate options', async () => {
    const { morganMock, middleware } = await setupMocks({
      MORGAN_FORMAT: 'combined',
      MORGAN_IMMEDIATE: 'true',
    });

    invokeMiddleware(middleware, morganMock);

    expect(morganMock).toHaveBeenCalledWith(
      'combined',
      expect.objectContaining({
        stream: expect.objectContaining({ write: expect.any(Function) }),
        skip: expect.any(Function),
        immediate: true,
      })
    );
  });

  it('streams 2xx/3xx morgan output to logger.info', async () => {
    const { morganMock, middleware, loggerInfoMock, loggerWarnMock, loggerErrorMock } =
      await setupMocks();

    const { options } = invokeMiddleware(middleware, morganMock, 200);
    options.stream.write(' GET /api/v1/users 200\n');

    expect(loggerInfoMock).toHaveBeenCalledWith('GET /api/v1/users 200');
    expect(loggerWarnMock).not.toHaveBeenCalled();
    expect(loggerErrorMock).not.toHaveBeenCalled();
  });

  it('streams 4xx morgan output to logger.warn', async () => {
    const { morganMock, middleware, loggerWarnMock, loggerInfoMock, loggerErrorMock } =
      await setupMocks();

    const { options } = invokeMiddleware(middleware, morganMock, 404);
    options.stream.write(' GET /api/v1/users 404\n');

    expect(loggerWarnMock).toHaveBeenCalledWith('GET /api/v1/users 404');
    expect(loggerInfoMock).not.toHaveBeenCalled();
    expect(loggerErrorMock).not.toHaveBeenCalled();
  });

  it('streams 5xx morgan output to logger.error', async () => {
    const { morganMock, middleware, loggerErrorMock, loggerInfoMock, loggerWarnMock } =
      await setupMocks();

    const { options } = invokeMiddleware(middleware, morganMock, 500);
    options.stream.write(' GET /api/v1/users 500\n');

    expect(loggerErrorMock).toHaveBeenCalledWith('GET /api/v1/users 500');
    expect(loggerInfoMock).not.toHaveBeenCalled();
    expect(loggerWarnMock).not.toHaveBeenCalled();
  });

  it('routes logs to logger.info when immediate logging is enabled regardless of status', async () => {
    const { morganMock, middleware, loggerInfoMock, loggerWarnMock, loggerErrorMock } =
      await setupMocks({
        MORGAN_IMMEDIATE: 'true',
      });

    const { options } = invokeMiddleware(middleware, morganMock, 500);
    options.stream.write(' GET /api/v1/users 500\n');

    expect(loggerInfoMock).toHaveBeenCalledWith('GET /api/v1/users 500');
    expect(loggerWarnMock).not.toHaveBeenCalled();
    expect(loggerErrorMock).not.toHaveBeenCalled();
  });

  it('trims whitespace from morgan messages before logging', async () => {
    const { morganMock, middleware, loggerInfoMock } = await setupMocks();

    const { options } = invokeMiddleware(middleware, morganMock, 200);
    options.stream.write('  GET /api/v1/users 200  \n');

    expect(loggerInfoMock).toHaveBeenCalledWith('GET /api/v1/users 200');
  });

  it('skips health check requests when MORGAN_SKIP_HEALTH_CHECK is true', async () => {
    const { morganMock, middleware } = await setupMocks();

    invokeMiddleware(middleware, morganMock);

    const options = morganMock.mock.calls[0][1] as { skip: (req: Request) => boolean };
    const skipHealth = options.skip({ path: '/health' } as Request);
    const skipOther = options.skip({ path: '/api/v1/users' } as Request);

    expect(skipHealth).toBe(true);
    expect(skipOther).toBe(false);
  });

  it('does not skip health check requests when MORGAN_SKIP_HEALTH_CHECK is false', async () => {
    const { morganMock, middleware } = await setupMocks({ MORGAN_SKIP_HEALTH_CHECK: 'false' });

    invokeMiddleware(middleware, morganMock);

    const options = morganMock.mock.calls[0][1] as { skip: (req: Request) => boolean };
    const skipHealth = options.skip({ path: '/health' } as Request);

    expect(skipHealth).toBe(false);
  });

  it('exposes requestId from the request object', async () => {
    const { tokenMock } = await setupMocks();

    const requestIdToken = tokenMock.mock.calls.find(([name]) => name === 'requestId')![1] as (
      req: Request
    ) => string;

    expect(requestIdToken({ requestId: 'req-123' } as Request)).toBe('req-123');
    expect(requestIdToken({} as Request)).toBe('-');
  });

  it('exposes userId from the request object', async () => {
    const { tokenMock } = await setupMocks();

    const userIdToken = tokenMock.mock.calls.find(([name]) => name === 'userId')![1] as (
      req: Request
    ) => string;

    expect(userIdToken({ user: { id: 'user-123' } } as Request)).toBe('user-123');
    expect(userIdToken({} as Request)).toBe('-');
  });

  it('invokes the morgan middleware with the request and response', async () => {
    const { morganMock, middleware } = await setupMocks();
    const morganHandler = vi.fn();

    morganMock.mockReturnValue(morganHandler);

    const req = { path: '/api/v1/users' } as Request;
    const res = { statusCode: 200 } as Response;
    const next = vi.fn();

    middleware(req, res, next);

    expect(morganHandler).toHaveBeenCalledWith(req, res, next);
  });
});
