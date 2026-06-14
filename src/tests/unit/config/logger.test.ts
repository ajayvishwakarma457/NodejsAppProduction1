import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const createMockLogger = () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: vi.fn().mockReturnThis(),
});

let mockLogger = createMockLogger();

const formatApi = (transform?: (info: unknown) => unknown) => () => ({
  transform,
});
formatApi.combine = vi.fn((...args: unknown[]) => args);
formatApi.timestamp = vi.fn(() => 'timestamp-format');
formatApi.json = vi.fn(() => 'json-format');
formatApi.colorize = vi.fn(() => 'colorize-format');
formatApi.printf = vi.fn((fn: unknown) => ({ kind: 'printf', fn }));
formatApi.errors = vi.fn(() => 'errors-format');

const mockConsoleTransport = vi.fn();

const mockWinston = {
  config: {
    syslog: {
      levels: { debug: 0, info: 1, warn: 2, error: 3 },
    },
  },
  format: formatApi,
  transports: {
    Console: mockConsoleTransport,
  },
  createLogger: vi.fn(() => mockLogger),
};

vi.mock('winston-daily-rotate-file', () => ({
  default: vi.fn(),
}));

describe('logger', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockLogger = createMockLogger();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.doUnmock('winston');
  });

  it('passes messages and metadata to the Winston logger', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('LOG_LEVEL', 'info');
    vi.doMock('winston', () => ({ default: mockWinston, ...mockWinston }));

    const { logger } = await import('../../../config/logger');

    logger.info('test message', { key: 'value' });

    expect(mockLogger.info).toHaveBeenCalledWith('test message', {
      meta: { key: 'value' },
    });
  });

  it('serializes Error instances in metadata', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('LOG_LEVEL', 'info');
    vi.doMock('winston', () => ({ default: mockWinston, ...mockWinston }));

    const { logger } = await import('../../../config/logger');
    const error = new Error('boom');

    logger.error('operation failed', { error });

    const callMeta = vi.mocked(mockLogger.error).mock.calls[0][1] as {
      meta: { error: { message: string; stack: string; name: string } };
    };

    expect(callMeta.meta.error.message).toBe('boom');
    expect(callMeta.meta.error.name).toBe('Error');
    expect(callMeta.meta.error.stack).toContain('Error: boom');
  });

  it('creates child loggers that include default metadata', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('LOG_LEVEL', 'info');
    vi.doMock('winston', () => ({ default: mockWinston, ...mockWinston }));

    const { createChildLogger } = await import('../../../config/logger');

    createChildLogger({ requestId: 'req-123' }).info('child message');

    expect(mockLogger.child).toHaveBeenCalledWith({ requestId: 'req-123' });
  });

  it('uses pretty colorized output when LOG_FORMAT=pretty', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('LOG_FORMAT', 'pretty');
    vi.stubEnv('LOG_LEVEL', 'info');
    vi.doMock('winston', () => ({ default: mockWinston, ...mockWinston }));

    await import('../../../config/logger');

    expect(formatApi.colorize).toHaveBeenCalled();
  });

  it('configures Winston with the configured LOG_LEVEL', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('LOG_LEVEL', 'warn');
    vi.doMock('winston', () => ({ default: mockWinston, ...mockWinston }));

    const winston = await import('winston');
    await import('../../../config/logger');

    expect(winston.createLogger).toHaveBeenCalledWith(expect.objectContaining({ level: 'warn' }));
  });

  it('adds rotating file transports in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('LOG_LEVEL', 'info');
    vi.doMock('winston', () => ({ default: mockWinston, ...mockWinston }));

    const DailyRotateFile = await import('winston-daily-rotate-file');
    await import('../../../config/logger');

    expect(DailyRotateFile.default).toHaveBeenCalledTimes(2);
  });
});
