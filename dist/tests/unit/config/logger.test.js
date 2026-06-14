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
const createMockLogger = () => ({
    debug: vitest_1.vi.fn(),
    info: vitest_1.vi.fn(),
    warn: vitest_1.vi.fn(),
    error: vitest_1.vi.fn(),
    child: vitest_1.vi.fn().mockReturnThis(),
});
let mockLogger = createMockLogger();
const formatApi = (transform) => () => ({
    transform,
});
formatApi.combine = vitest_1.vi.fn((...args) => args);
formatApi.timestamp = vitest_1.vi.fn(() => 'timestamp-format');
formatApi.json = vitest_1.vi.fn(() => 'json-format');
formatApi.colorize = vitest_1.vi.fn(() => 'colorize-format');
formatApi.printf = vitest_1.vi.fn((fn) => ({ kind: 'printf', fn }));
formatApi.errors = vitest_1.vi.fn(() => 'errors-format');
const mockConsoleTransport = vitest_1.vi.fn();
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
    createLogger: vitest_1.vi.fn(() => mockLogger),
};
vitest_1.vi.mock('winston-daily-rotate-file', () => ({
    default: vitest_1.vi.fn(),
}));
(0, vitest_1.describe)('logger', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.resetModules();
        vitest_1.vi.clearAllMocks();
        mockLogger = createMockLogger();
    });
    (0, vitest_1.afterEach)(() => {
        vitest_1.vi.unstubAllEnvs();
        vitest_1.vi.doUnmock('winston');
    });
    (0, vitest_1.it)('passes messages and metadata to the Winston logger', async () => {
        vitest_1.vi.stubEnv('NODE_ENV', 'test');
        vitest_1.vi.stubEnv('LOG_LEVEL', 'info');
        vitest_1.vi.doMock('winston', () => ({ default: mockWinston, ...mockWinston }));
        const { logger } = await Promise.resolve().then(() => __importStar(require('../../../config/logger')));
        logger.info('test message', { key: 'value' });
        (0, vitest_1.expect)(mockLogger.info).toHaveBeenCalledWith('test message', {
            meta: { key: 'value' },
        });
    });
    (0, vitest_1.it)('serializes Error instances in metadata', async () => {
        vitest_1.vi.stubEnv('NODE_ENV', 'test');
        vitest_1.vi.stubEnv('LOG_LEVEL', 'info');
        vitest_1.vi.doMock('winston', () => ({ default: mockWinston, ...mockWinston }));
        const { logger } = await Promise.resolve().then(() => __importStar(require('../../../config/logger')));
        const error = new Error('boom');
        logger.error('operation failed', { error });
        const callMeta = vitest_1.vi.mocked(mockLogger.error).mock.calls[0][1];
        (0, vitest_1.expect)(callMeta.meta.error.message).toBe('boom');
        (0, vitest_1.expect)(callMeta.meta.error.name).toBe('Error');
        (0, vitest_1.expect)(callMeta.meta.error.stack).toContain('Error: boom');
    });
    (0, vitest_1.it)('creates child loggers that include default metadata', async () => {
        vitest_1.vi.stubEnv('NODE_ENV', 'test');
        vitest_1.vi.stubEnv('LOG_LEVEL', 'info');
        vitest_1.vi.doMock('winston', () => ({ default: mockWinston, ...mockWinston }));
        const { createChildLogger } = await Promise.resolve().then(() => __importStar(require('../../../config/logger')));
        createChildLogger({ requestId: 'req-123' }).info('child message');
        (0, vitest_1.expect)(mockLogger.child).toHaveBeenCalledWith({ requestId: 'req-123' });
    });
    (0, vitest_1.it)('uses pretty colorized output when LOG_FORMAT=pretty', async () => {
        vitest_1.vi.stubEnv('NODE_ENV', 'test');
        vitest_1.vi.stubEnv('LOG_FORMAT', 'pretty');
        vitest_1.vi.stubEnv('LOG_LEVEL', 'info');
        vitest_1.vi.doMock('winston', () => ({ default: mockWinston, ...mockWinston }));
        await Promise.resolve().then(() => __importStar(require('../../../config/logger')));
        (0, vitest_1.expect)(formatApi.colorize).toHaveBeenCalled();
    });
    (0, vitest_1.it)('configures Winston with the configured LOG_LEVEL', async () => {
        vitest_1.vi.stubEnv('NODE_ENV', 'test');
        vitest_1.vi.stubEnv('LOG_LEVEL', 'warn');
        vitest_1.vi.doMock('winston', () => ({ default: mockWinston, ...mockWinston }));
        const winston = await Promise.resolve().then(() => __importStar(require('winston')));
        await Promise.resolve().then(() => __importStar(require('../../../config/logger')));
        (0, vitest_1.expect)(winston.createLogger).toHaveBeenCalledWith(vitest_1.expect.objectContaining({ level: 'warn' }));
    });
    (0, vitest_1.it)('adds rotating file transports in production', async () => {
        vitest_1.vi.stubEnv('NODE_ENV', 'production');
        vitest_1.vi.stubEnv('LOG_LEVEL', 'info');
        vitest_1.vi.doMock('winston', () => ({ default: mockWinston, ...mockWinston }));
        const DailyRotateFile = await Promise.resolve().then(() => __importStar(require('winston-daily-rotate-file')));
        await Promise.resolve().then(() => __importStar(require('../../../config/logger')));
        (0, vitest_1.expect)(DailyRotateFile.default).toHaveBeenCalledTimes(2);
    });
});
//# sourceMappingURL=logger.test.js.map