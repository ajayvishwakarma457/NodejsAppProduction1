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
const createMorganMock = () => {
    const tokenMock = vitest_1.vi.fn();
    const formatMock = vitest_1.vi.fn();
    const morganFn = vitest_1.vi.fn().mockReturnValue(() => { });
    const morganMock = Object.assign(morganFn, {
        token: tokenMock,
        format: formatMock,
    });
    return { morganMock, tokenMock, formatMock };
};
(0, vitest_1.describe)('morgan middleware', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.resetModules();
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.afterEach)(() => {
        vitest_1.vi.unstubAllEnvs();
        vitest_1.vi.doUnmock('morgan');
        vitest_1.vi.doUnmock('../../../config/logger');
    });
    const setupMocks = async (envOverrides) => {
        const { morganMock, tokenMock, formatMock } = createMorganMock();
        const loggerInfoMock = vitest_1.vi.fn();
        vitest_1.vi.doMock('morgan', () => ({ default: morganMock, ...morganMock }));
        vitest_1.vi.doMock('../../../config/logger', () => ({
            logger: { info: loggerInfoMock },
        }));
        vitest_1.vi.stubEnv('NODE_ENV', 'test');
        vitest_1.vi.stubEnv('HTTP_LOGGER', 'morgan');
        vitest_1.vi.stubEnv('MORGAN_FORMAT', 'combined');
        vitest_1.vi.stubEnv('MORGAN_SKIP_HEALTH_CHECK', 'true');
        vitest_1.vi.stubEnv('MORGAN_IMMEDIATE', 'false');
        for (const [key, value] of Object.entries(envOverrides ?? {})) {
            vitest_1.vi.stubEnv(key, value);
        }
        const module = await Promise.resolve().then(() => __importStar(require('../../../middleware/morgan.middleware')));
        return {
            morganMock,
            tokenMock,
            formatMock,
            loggerInfoMock,
            middleware: module.morganMiddleware,
        };
    };
    (0, vitest_1.it)('registers custom requestId and userId tokens', async () => {
        const { tokenMock } = await setupMocks();
        (0, vitest_1.expect)(tokenMock).toHaveBeenCalledWith('requestId', vitest_1.expect.any(Function));
        (0, vitest_1.expect)(tokenMock).toHaveBeenCalledWith('userId', vitest_1.expect.any(Function));
    });
    (0, vitest_1.it)('registers a structured json format', async () => {
        const { formatMock } = await setupMocks();
        (0, vitest_1.expect)(formatMock).toHaveBeenCalledWith('json', vitest_1.expect.any(Function));
    });
    (0, vitest_1.it)('configures morgan with the configured format, stream, skip and immediate options', async () => {
        const { morganMock } = await setupMocks({
            MORGAN_FORMAT: 'combined',
            MORGAN_IMMEDIATE: 'true',
        });
        (0, vitest_1.expect)(morganMock).toHaveBeenCalledWith('combined', vitest_1.expect.objectContaining({
            stream: vitest_1.expect.objectContaining({ write: vitest_1.expect.any(Function) }),
            skip: vitest_1.expect.any(Function),
            immediate: true,
        }));
    });
    (0, vitest_1.it)('streams morgan output to logger.info', async () => {
        const { morganMock, loggerInfoMock } = await setupMocks();
        const options = morganMock.mock.calls[0][1];
        options.stream.write(' GET /health 200\n');
        (0, vitest_1.expect)(loggerInfoMock).toHaveBeenCalledWith('GET /health 200');
    });
    (0, vitest_1.it)('skips health check requests when MORGAN_SKIP_HEALTH_CHECK is true', async () => {
        const { morganMock } = await setupMocks();
        const options = morganMock.mock.calls[0][1];
        const skipHealth = options.skip({ path: '/health' });
        const skipOther = options.skip({ path: '/api/v1/users' });
        (0, vitest_1.expect)(skipHealth).toBe(true);
        (0, vitest_1.expect)(skipOther).toBe(false);
    });
    (0, vitest_1.it)('does not skip health check requests when MORGAN_SKIP_HEALTH_CHECK is false', async () => {
        const { morganMock } = await setupMocks({ MORGAN_SKIP_HEALTH_CHECK: 'false' });
        const options = morganMock.mock.calls[0][1];
        const skipHealth = options.skip({ path: '/health' });
        (0, vitest_1.expect)(skipHealth).toBe(false);
    });
    (0, vitest_1.it)('exposes requestId from the request object', async () => {
        const { tokenMock } = await setupMocks();
        const requestIdToken = tokenMock.mock.calls.find(([name]) => name === 'requestId')[1];
        (0, vitest_1.expect)(requestIdToken({ requestId: 'req-123' })).toBe('req-123');
        (0, vitest_1.expect)(requestIdToken({})).toBe('-');
    });
    (0, vitest_1.it)('exposes userId from the request object', async () => {
        const { tokenMock } = await setupMocks();
        const userIdToken = tokenMock.mock.calls.find(([name]) => name === 'userId')[1];
        (0, vitest_1.expect)(userIdToken({ user: { id: 'user-123' } })).toBe('user-123');
        (0, vitest_1.expect)(userIdToken({})).toBe('-');
    });
});
//# sourceMappingURL=morgan.middleware.test.js.map