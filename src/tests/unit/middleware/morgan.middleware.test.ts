import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request } from 'express';

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

    vi.doMock('morgan', () => ({ default: morganMock, ...morganMock }));
    vi.doMock('../../../config/logger', () => ({
      logger: { info: loggerInfoMock },
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
    const { morganMock } = await setupMocks({
      MORGAN_FORMAT: 'combined',
      MORGAN_IMMEDIATE: 'true',
    });

    expect(morganMock).toHaveBeenCalledWith(
      'combined',
      expect.objectContaining({
        stream: expect.objectContaining({ write: expect.any(Function) }),
        skip: expect.any(Function),
        immediate: true,
      })
    );
  });

  it('streams morgan output to logger.info', async () => {
    const { morganMock, loggerInfoMock } = await setupMocks();

    const options = morganMock.mock.calls[0][1] as { stream: { write: (msg: string) => void } };
    options.stream.write(' GET /health 200\n');

    expect(loggerInfoMock).toHaveBeenCalledWith('GET /health 200');
  });

  it('skips health check requests when MORGAN_SKIP_HEALTH_CHECK is true', async () => {
    const { morganMock } = await setupMocks();

    const options = morganMock.mock.calls[0][1] as { skip: (req: Request) => boolean };
    const skipHealth = options.skip({ path: '/health' } as Request);
    const skipOther = options.skip({ path: '/api/v1/users' } as Request);

    expect(skipHealth).toBe(true);
    expect(skipOther).toBe(false);
  });

  it('does not skip health check requests when MORGAN_SKIP_HEALTH_CHECK is false', async () => {
    const { morganMock } = await setupMocks({ MORGAN_SKIP_HEALTH_CHECK: 'false' });

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
});
