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
(0, vitest_1.describe)('docs routes', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.resetModules();
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.afterEach)(() => {
        vitest_1.vi.unstubAllEnvs();
    });
    (0, vitest_1.it)('exports a docs router with Swagger UI and OpenAPI JSON endpoints', async () => {
        vitest_1.vi.stubEnv('DOCS_ENABLED', 'true');
        vitest_1.vi.stubEnv('DOCS_PATH', '/api-docs');
        const { docsRouter } = await Promise.resolve().then(() => __importStar(require('../../../modules/docs/docs.routes')));
        (0, vitest_1.expect)(docsRouter).toBeDefined();
        (0, vitest_1.expect)(typeof docsRouter.get).toBe('function');
        (0, vitest_1.expect)(typeof docsRouter.use).toBe('function');
    });
    (0, vitest_1.it)('serves the generated OpenAPI document as JSON', async () => {
        vitest_1.vi.stubEnv('DOCS_ENABLED', 'true');
        const { openApiDocument } = await Promise.resolve().then(() => __importStar(require('../../../config/openapi')));
        (0, vitest_1.expect)(openApiDocument).toBeDefined();
        (0, vitest_1.expect)(openApiDocument.openapi).toBe('3.0.0');
        (0, vitest_1.expect)(openApiDocument.info.title).toBeDefined();
        (0, vitest_1.expect)(openApiDocument.info.version).toBeDefined();
        (0, vitest_1.expect)(Array.isArray(openApiDocument.servers)).toBe(true);
        (0, vitest_1.expect)(openApiDocument.paths).toBeDefined();
    });
    (0, vitest_1.it)('includes documented paths for core resources', async () => {
        vitest_1.vi.stubEnv('DOCS_ENABLED', 'true');
        const { openApiDocument } = await Promise.resolve().then(() => __importStar(require('../../../config/openapi')));
        const paths = Object.keys(openApiDocument.paths);
        (0, vitest_1.expect)(paths).toContain('/health');
        (0, vitest_1.expect)(paths).toContain('/api/v1/auth/register');
        (0, vitest_1.expect)(paths).toContain('/api/v1/auth/login');
        (0, vitest_1.expect)(paths).toContain('/api/v1/users');
        (0, vitest_1.expect)(paths).toContain('/api/v1/tasks');
        (0, vitest_1.expect)(paths).toContain('/api/v1/projects');
        (0, vitest_1.expect)(paths).toContain('/api/v1/teams');
        (0, vitest_1.expect)(paths).toContain('/api/v1/comments');
        (0, vitest_1.expect)(paths).toContain('/api/v1/notifications');
        (0, vitest_1.expect)(paths).toContain('/api/v1/events/stream');
    });
    (0, vitest_1.it)('registers reusable schemas', async () => {
        vitest_1.vi.stubEnv('DOCS_ENABLED', 'true');
        const { openApiDocument } = await Promise.resolve().then(() => __importStar(require('../../../config/openapi')));
        (0, vitest_1.expect)(openApiDocument.components?.schemas).toBeDefined();
        const schemas = Object.keys(openApiDocument.components?.schemas ?? {});
        (0, vitest_1.expect)(schemas).toContain('User');
        (0, vitest_1.expect)(schemas).toContain('Team');
        (0, vitest_1.expect)(schemas).toContain('Project');
        (0, vitest_1.expect)(schemas).toContain('Task');
        (0, vitest_1.expect)(schemas).toContain('Comment');
        (0, vitest_1.expect)(schemas).toContain('Notification');
        (0, vitest_1.expect)(schemas).toContain('ApiKey');
        (0, vitest_1.expect)(schemas).toContain('ApiError');
        (0, vitest_1.expect)(schemas).toContain('PaginationMeta');
    });
    (0, vitest_1.it)('defines security schemes for bearer and API key auth', async () => {
        vitest_1.vi.stubEnv('DOCS_ENABLED', 'true');
        const { openApiDocument } = await Promise.resolve().then(() => __importStar(require('../../../config/openapi')));
        (0, vitest_1.expect)(openApiDocument.components?.securitySchemes).toBeDefined();
        (0, vitest_1.expect)(openApiDocument.components?.securitySchemes?.bearerAuth).toEqual({
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
        });
        (0, vitest_1.expect)(openApiDocument.components?.securitySchemes?.apiKeyAuth).toEqual({
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key',
        });
    });
});
(0, vitest_1.describe)('docs route integration', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.resetModules();
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.afterEach)(() => {
        vitest_1.vi.unstubAllEnvs();
    });
    (0, vitest_1.it)('openapi.json handler returns the document', async () => {
        vitest_1.vi.stubEnv('DOCS_ENABLED', 'true');
        const { docsRouter } = await Promise.resolve().then(() => __importStar(require('../../../modules/docs/docs.routes')));
        const { openApiDocument } = await Promise.resolve().then(() => __importStar(require('../../../config/openapi')));
        const jsonMock = vitest_1.vi.fn();
        const setHeaderMock = vitest_1.vi.fn();
        const res = {
            setHeader: setHeaderMock,
            json: jsonMock,
        };
        const routeLayer = docsRouter.stack.find((layer) => layer.route?.path === '/openapi.json');
        (0, vitest_1.expect)(routeLayer).toBeDefined();
        const handlers = routeLayer.route.stack;
        const getHandler = handlers.find((layer) => layer.method === 'get');
        (0, vitest_1.expect)(getHandler).toBeDefined();
        getHandler.handle({}, res, vitest_1.vi.fn());
        (0, vitest_1.expect)(setHeaderMock).toHaveBeenCalledWith('Content-Type', 'application/json');
        (0, vitest_1.expect)(jsonMock).toHaveBeenCalledWith(openApiDocument);
    });
});
//# sourceMappingURL=docs.routes.test.js.map