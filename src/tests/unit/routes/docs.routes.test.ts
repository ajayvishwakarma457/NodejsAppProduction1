import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response } from 'express';

describe('docs routes', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('exports a docs router with Swagger UI and OpenAPI JSON endpoints', async () => {
    vi.stubEnv('DOCS_ENABLED', 'true');
    vi.stubEnv('DOCS_PATH', '/api-docs');

    const { docsRouter } = await import('../../../routes/docs.routes');

    expect(docsRouter).toBeDefined();
    expect(typeof docsRouter.get).toBe('function');
    expect(typeof docsRouter.use).toBe('function');
  });

  it('serves the generated OpenAPI document as JSON', async () => {
    vi.stubEnv('DOCS_ENABLED', 'true');

    const { openApiDocument } = await import('../../../config/openapi');

    expect(openApiDocument).toBeDefined();
    expect(openApiDocument.openapi).toBe('3.0.0');
    expect(openApiDocument.info.title).toBeDefined();
    expect(openApiDocument.info.version).toBeDefined();
    expect(Array.isArray(openApiDocument.servers)).toBe(true);
    expect(openApiDocument.paths).toBeDefined();
  });

  it('includes documented paths for core resources', async () => {
    vi.stubEnv('DOCS_ENABLED', 'true');

    const { openApiDocument } = await import('../../../config/openapi');
    const paths = Object.keys(openApiDocument.paths);

    expect(paths).toContain('/health');
    expect(paths).toContain('/api/v1/auth/register');
    expect(paths).toContain('/api/v1/auth/login');
    expect(paths).toContain('/api/v1/users');
    expect(paths).toContain('/api/v1/tasks');
    expect(paths).toContain('/api/v1/projects');
    expect(paths).toContain('/api/v1/teams');
    expect(paths).toContain('/api/v1/comments');
    expect(paths).toContain('/api/v1/notifications');
    expect(paths).toContain('/api/v1/events/stream');
  });

  it('registers reusable schemas', async () => {
    vi.stubEnv('DOCS_ENABLED', 'true');

    const { openApiDocument } = await import('../../../config/openapi');

    expect(openApiDocument.components?.schemas).toBeDefined();
    const schemas = Object.keys(openApiDocument.components?.schemas ?? {});

    expect(schemas).toContain('User');
    expect(schemas).toContain('Team');
    expect(schemas).toContain('Project');
    expect(schemas).toContain('Task');
    expect(schemas).toContain('Comment');
    expect(schemas).toContain('Notification');
    expect(schemas).toContain('ApiKey');
    expect(schemas).toContain('ApiError');
    expect(schemas).toContain('PaginationMeta');
  });

  it('defines security schemes for bearer and API key auth', async () => {
    vi.stubEnv('DOCS_ENABLED', 'true');

    const { openApiDocument } = await import('../../../config/openapi');

    expect(openApiDocument.components?.securitySchemes).toBeDefined();
    expect(openApiDocument.components?.securitySchemes?.bearerAuth).toEqual({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    });
    expect(openApiDocument.components?.securitySchemes?.apiKeyAuth).toEqual({
      type: 'apiKey',
      in: 'header',
      name: 'X-API-Key',
    });
  });
});

describe('docs route integration', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('openapi.json handler returns the document', async () => {
    vi.stubEnv('DOCS_ENABLED', 'true');

    const { docsRouter } = await import('../../../routes/docs.routes');
    const { openApiDocument } = await import('../../../config/openapi');

    const jsonMock = vi.fn();
    const setHeaderMock = vi.fn();
    const res = {
      setHeader: setHeaderMock,
      json: jsonMock,
    } as unknown as Response;

    const routeLayer = docsRouter.stack.find(
      (layer: {
        route?: {
          path: string;
          stack: {
            method: string;
            handle: (req: Request, res: Response, next: () => void) => void;
          }[];
        };
      }) => layer.route?.path === '/openapi.json'
    );
    expect(routeLayer).toBeDefined();

    const handlers = routeLayer!.route!.stack;
    const getHandler = handlers.find((layer: { method: string }) => layer.method === 'get');
    expect(getHandler).toBeDefined();

    getHandler!.handle({} as Request, res, vi.fn());

    expect(setHeaderMock).toHaveBeenCalledWith('Content-Type', 'application/json');
    expect(jsonMock).toHaveBeenCalledWith(openApiDocument);
  });
});
