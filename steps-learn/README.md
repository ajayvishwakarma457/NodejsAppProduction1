# Complete Project Learning Guide

This guide helps you understand every file and directory in the project. Read them in the order below.

## 1. Project root files

| File | Purpose |
|------|---------|
| `package.json` | All dependencies and npm scripts |
| `.env.example` | Every environment variable the app uses |
| `tsconfig.json` | TypeScript compiler config |
| `vitest.config.ts` | Unit test config |
| `vitest.integration.config.ts` | Integration test config |
| `playwright.config.ts` | E2E test config |
| `eslint.config.mts` | Linting rules |
| `AGENTS.md` | Rules for AI tools working on this repo |
| `README.md` | Human quick-start |
| `ai-context/*.md` | Project context, architecture, decisions |

## 2. Entry points

### `src/server.ts`
- Creates the HTTP server.
- Connects to MongoDB and Redis.
- Starts Socket.IO, raw WebSocket server, and background jobs.
- Handles graceful shutdown.

### `src/app.ts`
- Configures Express app.
- Applies middleware in order: security, CORS, request ID, logger, body parser, static files, idempotency, routes, docs, errors.

## 3. Configuration layer (`src/config/`)

| File | What to learn |
|------|--------------|
| `env.ts` | All env variables validated with Zod |
| `logger.ts` | Winston logger with JSON/pretty formats and rotation |
| `db.ts` | MongoDB connection setup |
| `redis.ts` | Redis client setup |
| `passport.ts` | Google/GitHub OAuth strategies |
| `openapi.ts` | Full OpenAPI/Swagger spec |

## 4. Middleware layer (`src/middleware/`)

Read these in order:

| File | Purpose |
|------|---------|
| `requestId.middleware.ts` | Adds `X-Request-Id` correlation IDs |
| `morgan.middleware.ts` | Apache-style HTTP request logging |
| `auth.middleware.ts` | JWT + API key authentication |
| `role.middleware.ts` | Role-based access control |
| `validate.middleware.ts` | Zod request validation |
| `rateLimit.middleware.ts` | Redis-backed rate limiting |
| `upload.middleware.ts` | Multer file upload handling |
| `idempotency.middleware.ts` | Idempotency keys with Redis |
| `error.middleware.ts` | Centralized error handling |
| `notFound.middleware.ts` | 404 handler |

## 5. Shared utilities (`src/utils/`)

Study these before modules:

| File | Purpose |
|------|---------|
| `ApiError.ts` | Custom app errors with status codes |
| `ApiResponse.ts` | Standard success response wrapper |
| `asyncHandler.ts` | Catches errors in async route handlers |
| `pagination.ts` | Offset pagination helpers |
| `query-optimizer.ts` | Cursor pagination, search, projections |
| `cache.ts` | Cache-aside helpers |
| `transaction.ts` | MongoDB transaction wrapper |
| `rbac.ts` | Role/ownership checks |
| `serializer.ts` | Mongoose document serialization |
| `event-bus.ts` | Typed event emitter |
| `aggregation.ts` | MongoDB aggregation helpers |

## 6. Shared services (`src/services/`)

| File | Purpose |
|------|---------|
| `token.service.ts` | JWT access/refresh tokens + blacklisting |
| `email.service.ts` | SMTP email sending |
| `storage.service.ts` | Local/S3 file storage abstraction |
| `redis.service.ts` | Redis data-structure wrapper |
| `bullmq.service.ts` | BullMQ queue/worker setup |
| `socket.service.ts` | Socket.IO broadcasting |
| `sse.service.ts` | Server-Sent Events |
| `ws.service.ts` | Raw WebSocket server |

## 7. Module structure

Every module follows the same pattern. Learn one fully, then the rest are easy.

### Example: `src/modules/tasks/`

| File | Purpose |
|------|---------|
| `task.model.ts` | Mongoose schema + indexes |
| `task.validation.ts` | Zod schemas for body/query/params |
| `task.routes.ts` | Express routes + middleware |
| `task.controller.ts` | HTTP request/response handling |
| `task.service.ts` | Business logic + caching + events |
| `task.repository.ts` | Database queries + aggregations |

### All modules to study

```
src/modules/
├── auth/           # Register, login, refresh, OAuth, logout
├── api-keys/       # API key CRUD + scopes
├── users/          # User CRUD + search/filter
├── teams/          # Teams + member management
├── projects/       # Projects scoped to teams
├── tasks/          # Tasks with status/priority/filter
├── comments/       # Comments on tasks
├── notifications/  # Notification feed + dashboard
└── files/          # File upload/stream/multipart
```

## 8. Real-time (`src/sockets/`, `src/ws/`)

| File | Purpose |
|------|---------|
| `src/sockets/index.ts` | Socket.IO default namespace |
| `src/sockets/namespaces/*.ts` | Task/team/notification namespaces |
| `src/sockets/auth.ts` | Socket.IO JWT auth |
| `src/ws/index.ts` | Raw WebSocket server |
| `src/ws/helpers.ts` | WS auth + heartbeat |
| `src/controllers/sse.controller.ts` | SSE endpoint controller |
| `src/routes/sse.routes.ts` | SSE route |

## 9. Background jobs (`src/jobs/`)

| File | Purpose |
|------|---------|
| `index.ts` | Job orchestrator |
| `email.job.ts` | Email queue processing |
| `notification.job.ts` | Notification delivery |
| `reminder.job.ts` | Due-date reminders |
| `report.job.ts` | BullMQ sample job |

## 10. Events (`src/events/`)

| File | Purpose |
|------|---------|
| `index.ts` | Registers all event handlers |
| `handlers/user.handler.ts` | User event side effects |
| `handlers/task.handler.ts` | Task event side effects |
| `handlers/project.handler.ts` | Project event side effects |

## 11. Migrations & seeders (`src/migrations/`, `src/seeders/`)

| File | Purpose |
|------|---------|
| `migrations/migration-runner.ts` | Run MongoDB migrations |
| `migrations/migration-lock.ts` | Distributed migration locking |
| `seeders/seeder-runner.ts` | Run environment-scoped seeds |
| `scripts/migrate.ts` | CLI for migrations |
| `scripts/seed.ts` | CLI for seeders |

## 12. Testing structure

```
src/tests/
├── unit/              # Vitest unit tests
│   ├── middleware/
│   ├── modules/
│   ├── services/
│   └── utils/
├── integration/       # Supertest HTTP tests
└── e2e/               # Playwright tests
```

## 13. Suggested reading order

### Day 1 — Project skeleton
1. `ai-context/project-overview.md`
2. `ai-context/architecture.md`
3. `src/server.ts`
4. `src/app.ts`
5. `src/config/env.ts`

### Day 2 — Request pipeline
1. `src/middleware/requestId.middleware.ts`
2. `src/middleware/auth.middleware.ts`
3. `src/middleware/validate.middleware.ts`
4. `src/middleware/error.middleware.ts`
5. `src/utils/ApiError.ts`
6. `src/utils/asyncHandler.ts`

### Day 3 — One full module
1. `src/modules/tasks/task.model.ts`
2. `src/modules/tasks/task.validation.ts`
3. `src/modules/tasks/task.routes.ts`
4. `src/modules/tasks/task.controller.ts`
5. `src/modules/tasks/task.service.ts`
6. `src/modules/tasks/task.repository.ts`

### Day 4 — Auth & security
1. `src/modules/auth/auth.routes.ts`
2. `src/modules/auth/auth.controller.ts`
3. `src/modules/auth/auth.service.ts`
4. `src/services/token.service.ts`
5. `src/modules/api-keys/api-key.service.ts`
6. `src/config/passport.ts`

### Day 5 — Shared services
1. `src/services/redis.service.ts`
2. `src/utils/cache.ts`
3. `src/utils/transaction.ts`
4. `src/services/storage.service.ts`
5. `src/services/email.service.ts`

### Day 6 — Real-time & jobs
1. `src/sockets/index.ts`
2. `src/ws/index.ts`
3. `src/services/sse.service.ts`
4. `src/jobs/index.ts`
5. `src/events/index.ts`

### Day 7 — Advanced features
1. `src/middleware/idempotency.middleware.ts`
2. `src/middleware/rateLimit.middleware.ts`
3. `src/utils/query-optimizer.ts`
4. `src/utils/aggregation.ts`
5. `src/config/openapi.ts`

## 14. How to read code effectively

For every file, ask:

1. **What is its single responsibility?**
2. **What does it import?** (shows dependencies)
3. **What does it export?** (shows public API)
4. **Who calls it?** (use `grep` or explore imports)
5. **What errors can occur?**
6. **How is it tested?**

### Useful grep commands

```bash
# Find who uses a function
grep -r "taskService" src/

# Find all routes
grep -r "Router()" src/modules/

# Find all env variables
grep -r "env\." src/ | grep -v node_modules

# Find all event emissions
grep -r "eventBus.emit" src/
```

## 15. Practice exercises

To fully learn the project, do these:

1. **Trace a login request** from `auth.routes.ts` → `auth.controller.ts` → `auth.service.ts` → `token.service.ts`.
2. **Trace a task creation** including event emission and cache invalidation.
3. **Add a new endpoint** `GET /api/v1/tasks/overdue` that returns overdue tasks.
4. **Add a new notification type** and handle it in the event bus.
5. **Write an integration test** for user registration.
