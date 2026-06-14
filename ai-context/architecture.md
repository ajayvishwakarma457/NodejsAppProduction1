# Architecture

## High Level

The backend uses a feature-module structure under `src/modules`, with shared infrastructure placed in dedicated folders for config, middleware, jobs, sockets, services, and utilities.

## Testing Strategy

- **Unit tests** — Vitest-based tests under `src/tests/unit/` (excluding `src/tests/integration/`). They run with `npm test` and focus on services, utilities, middleware, and domain logic in isolation.
- **Integration tests** — Supertest-based HTTP tests under `src/tests/integration/`. They run with `npm run test:integration` against a dedicated `nodejs-app-production1-integration-test` MongoDB database and a real Redis instance, configured in `vitest.integration.config.ts`.
- **Isolation** — Integration tests connect once per test file, clean all collections after each test, and run sequentially (`fileParallelism: false`) to avoid cross-test data races.
- **Environment** — Integration tests override process env before the app loads, disabling background jobs, WebSocket, event bus, and rate limiting so the suite stays deterministic.

## Main Modules

- `auth`
- `api-keys`
- `users`
- `teams`
- `projects`
- `tasks`
- `comments`
- `notifications`

## Aggregation Pipelines

- `utils/aggregation.ts` provides production-grade aggregation helpers:
  - `timedAggregate()` — executes read-only pipelines with `maxTimeMS`, `allowDiskUse`, optional sessions, timing, and slow-query logging.
  - `paginatedAggregate()` — wraps `$facet` pagination around any pipeline.
  - `buildFacetPagination()` / `buildDateGroupStage()` — reusable building blocks.
  - `explainAggregate()` — returns `executionStats` for index tuning.
  - `sanitizePipeline()` — blocks destructive stages (`$out`, `$merge`) to keep analytics read-only.
- Repositories expose scoped aggregation methods:
  - `tasks` — status/priority distribution, overdue summary, workload by assignee.
  - `projects` — status distribution, per-project task summary (via `$lookup`).
  - `notifications` — unread counts by type, delivery stats.
  - `comments` — comment counts per task.
- Dashboard endpoints expose these rollups:
  - `GET /api/v1/projects/dashboard`
  - `GET /api/v1/tasks/dashboard`
  - `GET /api/v1/notifications/dashboard`

## Redis Service & Cache-Aside Pattern

- `services/redis.service.ts` is a production-grade Redis wrapper built on the `redis` 4.x client.
- It provides automatic namespacing, connection management, safe execution with fallbacks, and structured logging.
- Supported data structure helpers:
  - **Strings** — `set`, `get`, `setJSON`, `getJSON`, `getOrSet`, `del`, `exists`, `expire`, `incrBy`, `decrBy`, `deletePattern`, `lock`.
  - **Hashes** — `hSet`, `hSetMultiple`, `hGet`, `hGetAll`, `hDel`, `hExists`, `hIncrBy`, `hKeys`, `hLen`.
  - **Sorted Sets** — `zAdd`, `zAddJSON`, `zRange`, `zRevRange`, `zRangeWithScores`, `zRevRangeWithScores`, `zRangeJSON`, `zRevRangeJSON`, `zRangeWithScoresJSON`, `zRank`, `zRevRank`, `zScore`, `zCard`, `zCount`, `zIncrBy`, `zRemRangeByScore`.
  - **TTL helpers** — `ttl`, `persist`.
- Complex values are serialized with a `__json__:` prefix; the wrapper automatically deserializes them on read, including numeric strings where appropriate.
- `utils/cache.ts` provides a namespace-scoped cache-aside helper (`cacheAside.getOrSet`) and invalidation helpers (`invalidate`, `invalidatePattern`, `invalidateEntity`).
- Domain services use cache-aside for entity reads and invalidate on writes:
  - `users` — `getById` cached; invalidated on `update` and `remove`.
  - `teams` — `getById` cached; invalidated on `create`, `update`, `remove`, `addMember`, and `removeMember`.
  - `projects` — `getById` cached; invalidated on `create`, `update`, and `remove`.
  - `tasks` — `getById` cached; invalidated on `create`, `update`, and `remove`.

## File Uploads, Streaming, Storage & Image Processing

- `middleware/upload.middleware.ts` uses Multer with `memoryStorage()` for server-side upload handling.
- Production-grade limits are enforced:
  - `STORAGE_MAX_FILE_SIZE_MB` per-file limit
  - max file count, field count, and multipart part limits
  - MIME type allow-list via `STORAGE_ALLOWED_MIME_TYPES`
  - structured `MulterError` → `ApiError` conversion with request context logging
- `services/storage.service.ts` provides a provider-pattern storage abstraction:
  - `LocalStorageProvider` — stores files on disk with directory traversal protection, unique safe filenames, upload/delete/exists/stream/URL. Uploads persist original mimetype/size metadata in a sidecar `.meta.json` so `getMetadata` returns accurate `Content-Type` for streamed responses.
  - `S3StorageProvider` — production-grade AWS S3 implementation using AWS SDK v3:
    - `PutObjectCommand` for uploads with correct `ContentType`
    - `DeleteObjectCommand`, `HeadObjectCommand`, `GetObjectCommand`
    - multipart upload support (`CreateMultipartUploadCommand`, `UploadPartCommand`, `CompleteMultipartUploadCommand`, `AbortMultipartUploadCommand`)
    - public URL generation (supports virtual-hosted style, custom endpoint, and `S3_PUBLIC_URL`)
    - temporary presigned URLs for private access and multipart part uploads
    - runtime validation of required S3 env vars
    - structured S3 error handling and logging
  - **Image processing** — when `IMAGE_PROCESSING_ENABLED=true`, uploaded images are processed by Sharp:
    - master image resized to `IMAGE_MAX_WIDTH` x `IMAGE_MAX_HEIGHT` and converted to `IMAGE_OUTPUT_FORMAT`
    - predefined variants generated per `IMAGE_VARIANTS` config (e.g., thumbnail, medium, large)
    - all variants uploaded and returned in `UploadResult.variants`
- `utils/image-processor.ts` — Sharp-based image processing utility:
  - MIME type detection for supported image formats
  - `Range` header parsing
  - variant config parsing (`name:width[xheight][:fit]`)
  - quality, format, and resize handling
- `modules/files/file.service.ts` handles streaming logic:
  - HTTP `Range` header parsing (`bytes=start-end`, `bytes=start-`, `bytes=-suffix`)
  - `206 Partial Content` responses with `Content-Range`
  - `416 Range Not Satisfiable` for invalid ranges
- `modules/files/file.routes.ts` exposes file endpoints:
  - `GET /api/v1/files/:key/stream` — stream a file with range support
  - `POST /api/v1/files/multipart/init` — initiate a direct-to-S3 multipart upload
  - `POST /api/v1/files/multipart/url` — get a presigned URL for a part
  - `POST /api/v1/files/multipart/complete` — complete a multipart upload
  - `POST /api/v1/files/multipart/abort` — abort a multipart upload
- Static files are served from `/uploads` when `STORAGE_PROVIDER=local`, with immutable caching headers and `nosniff`.

## Query Optimization & Indexing

- All schema definitions declare named MongoDB indexes aligned with the dominant read patterns (ownership, membership, status, due dates, feeds, TTL cleanup).
- `utils/query-optimizer.ts` provides:
  - `timedQuery()` — wraps Mongoose queries with execution timing and slow-query logging.
  - `buildListProjection()` — strips internal/version fields from list responses.
  - `buildRegexSearchFilter()` / `buildTextSearchFilter()` — safe search helpers.
  - `applyCursorPagination()` — cursor-based pagination helper for high-throughput feeds.
- `utils/index-manager.ts` lists collection indexes, syncs Mongoose indexes, and reports missing recommended indexes.
- Repositories consistently use projections, pagination, and `timedQuery()` for read paths.

## Transactions & Rollbacks

- `utils/transaction.ts` — Reusable MongoDB transaction helper with topology detection and fallback for standalone servers
- `utils/compensating-transaction.ts` — Saga-style compensating rollback for cross-system operations
- Services wrap multi-document mutations in transactions:
  - `teamService.create` — create team + add owner atomically
  - `teamService.remove` — cascade delete projects, tasks, comments
  - `projectService.remove` — cascade delete tasks, comments
  - `taskService.remove` — delete task + comments
  - `userService.remove` — cascade delete teams, projects, tasks, comments, notifications, API keys
- Repositories accept an optional `ClientSession` and expose `deleteMany` helpers

## Migrations & Seeders

- `migrations` — Migration framework (`migration-runner`, `migration-lock`, tracking model, and timestamped migration files)
- `seeders` — Seeder framework (`seeder-runner`, tracking model, and environment-scoped seed files)
- `scripts` — CLI entry points for `migrate`, `seed`, and `migrate-and-seed`

## Data Flow

Typical request flow:

1. Request enters through `app.ts` and route registration.
2. Middleware handles auth, rate limiting, and errors.
3. Module routes call controllers.
4. Controllers delegate business logic to services.
5. Services use repositories, models, shared services, Redis, or database config as needed.
6. Jobs and sockets handle async notifications, reminders, email work, and realtime collaboration events.

## Environments

- Local
- Staging
- Production

## Folder Structure

```text
src/
├── config/
│   ├── db.ts
│   ├── redis.ts
│   ├── env.ts
│   ├── logger.ts
│   └── passport.ts
│
├── migrations/
│   ├── migration-runner.ts
│   ├── migration-lock.ts
│   ├── migration-lock.model.ts
│   ├── migration.model.ts
│   ├── migration.types.ts
│   ├── index.ts
│   └── files/
│       ├── 001_initialize_migration_tracking.ts
│       └── 002_ensure_application_indexes.ts
│
├── seeders/
│   ├── seeder-runner.ts
│   ├── seeder.model.ts
│   ├── seeder.types.ts
│   ├── index.ts
│   └── files/
│       ├── 001_seed_admin_user.ts
│       └── 002_seed_demo_team_and_project.ts
│
├── scripts/
│   ├── migrate.ts
│   ├── seed.ts
│   └── migrate-and-seed.ts
│
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.repository.ts
│   │   ├── auth.routes.ts
│   │   ├── auth.validation.ts
│   │   └── auth.utils.ts
│   │
│   ├── api-keys/
│   │   ├── api-key.controller.ts
│   │   ├── api-key.service.ts
│   │   ├── api-key.repository.ts
│   │   ├── api-key.routes.ts
│   │   ├── api-key.validation.ts
│   │   └── api-key.model.ts
│   │
│   ├── users/
│   │   ├── user.controller.ts
│   │   ├── user.service.ts
│   │   ├── user.repository.ts
│   │   ├── user.routes.ts
│   │   ├── user.validation.ts
│   │   └── user.model.ts
│   │
│   ├── teams/
│   │   ├── team.controller.ts
│   │   ├── team.service.ts
│   │   ├── team.repository.ts
│   │   ├── team.routes.ts
│   │   ├── team.validation.ts
│   │   └── team.model.ts
│   │
│   ├── projects/
│   │   ├── project.controller.ts
│   │   ├── project.service.ts
│   │   ├── project.repository.ts
│   │   ├── project.routes.ts
│   │   ├── project.validation.ts
│   │   └── project.model.ts
│   │
│   ├── tasks/
│   │   ├── task.controller.ts
│   │   ├── task.service.ts
│   │   ├── task.repository.ts
│   │   ├── task.routes.ts
│   │   ├── task.validation.ts
│   │   └── task.model.ts
│   │
│   ├── comments/
│   │   ├── comment.controller.ts
│   │   ├── comment.service.ts
│   │   ├── comment.repository.ts
│   │   ├── comment.routes.ts
│   │   ├── comment.validation.ts
│   │   └── comment.model.ts
│   │
│   └── notifications/
│       ├── notification.controller.ts
│       ├── notification.service.ts
│       ├── notification.repository.ts
│       ├── notification.routes.ts
│       ├── notification.validation.ts
│       └── notification.model.ts
│   │
│   └── files/
│       ├── file.controller.ts
│       ├── file.service.ts
│       ├── file.routes.ts
│       └── file.validation.ts
│
├── middleware/
│   ├── auth.middleware.ts
│   ├── role.middleware.ts
│   ├── validate.middleware.ts
│   ├── error.middleware.ts
│   ├── rateLimit.middleware.ts
│   └── upload.middleware.ts
│
├── services/
│   ├── email.service.ts
│   ├── storage.service.ts
│   ├── redis.service.ts
│   ├── bullmq.service.ts
│   ├── token.service.ts
│   └── socket.service.ts
│
├── jobs/
│   ├── email.job.ts
│   ├── reminder.job.ts
│   ├── notification.job.ts
│   ├── report.job.ts
│   └── index.ts
│
├── events/
│   ├── index.ts
│   └── handlers/
│       ├── user.handler.ts
│       ├── task.handler.ts
│       └── project.handler.ts
│
├── sockets/
│   ├── index.ts
│   ├── auth.ts
│   ├── task.socket.ts
│   ├── notification.socket.ts
│   ├── team.socket.ts
│   └── namespaces/
│       ├── index.ts
│       ├── tasks.namespace.ts
│       ├── teams.namespace.ts
│       └── notifications.namespace.ts
│
├── ws/
│   ├── index.ts
│   ├── helpers.ts
│   └── handlers/
│       └── message.handler.ts
│
## Background Jobs

- `jobs/index.ts` orchestrates background jobs.
- Legacy cron-based jobs remain untouched and use the custom Redis list queue (`utils/queue.ts`):
  - `email.job.ts` — processes queued emails with retries and DLQ
  - `notification.job.ts` — delivers in-app and email notifications
  - `reminder.job.ts` — scans tasks and enqueues email reminders
- `utils/distributed-lock.ts` wraps each cron handler with a Redis distributed lock (SET NX EX) using the `cron` namespace. Only one app instance acquires the lock and runs a given job per tick; others skip. TTL is configurable via `CRON_JOB_LOCK_TTL_SECONDS`.
- `utils/queue.ts` provides a lightweight Redis list-based queue with enqueue/dequeue/batch/requeue/DLQ support. Optional per-job `priority` is stored in a Redis sorted set (`queue:{name}:priority`) and dequeued before unprioritized FIFO jobs; lower numbers mean higher priority, matching BullMQ semantics.
- BullMQ jobs (e.g., `report.job.ts`) support the standard `priority` option on `enqueue()`.
- New features use **BullMQ** (`services/bullmq.service.ts`):
  - Production-grade Redis-backed queues and workers
  - Retries with exponential backoff
  - Delayed jobs, job deduplication via `jobId`, and queue stats
  - `jobs/report.job.ts` is a sample BullMQ feature for asynchronous report generation
  - BullMQ workers are initialized in `jobOrchestrator.startAll()` and closed gracefully in `stopAll()`

## Socket.IO / Realtime

- `services/socket.service.ts` wraps the Socket.IO `Server` instance and exposes:
  - `emitToRoom(room, event, data)` — broadcast to a room on the default namespace.
  - `emitToNamespace(namespace, room, event, data)` — broadcast to a room inside a specific namespace.
  - `emitToUser(userId, event, data)` — broadcast to a user's notification room on both the default namespace and `/notifications` namespace.
  - `emitToAll(event, data)` — broadcast to every connected socket.
- `sockets/index.ts` registers the default namespace connection handler:
  - JWT auth via `socket.handshake.auth.token`.
  - Each authenticated socket joins a per-user notification room (`notification:{userId}`).
  - Registers task, notification, and team socket handlers.
- `sockets/namespaces/index.ts` registers additional namespaces additively:
  - `/tasks` — task room join/leave events.
  - `/teams` — team room join/leave events.
  - `/notifications` — per-user notification room for push delivery.
- Existing default-namespace behavior is unchanged; namespaces are an opt-in entry point for clients.
- Lightweight `ws` alternative (`services/ws.service.ts`, `ws/index.ts`):
  - Runs on a separate port (`WS_PORT`, default `3001`) so it never conflicts with Socket.IO.
  - JWT auth via query param `?token=` or `sec-websocket-protocol` header.
  - Per-user delivery (`emitToUser`), channel subscriptions (`subscribe:<channel>` / `unsubscribe:<channel>`), broadcasting, and ping/pong heartbeat.
  - `socketService.emitToUser` also pushes to connected `ws` clients, so notifications reach both Socket.IO and `ws` users.
- Server-Sent Events (SSE) (`services/sse.service.ts`, `controllers/sse.controller.ts`, `routes/sse.routes.ts`):
  - `GET /api/v1/events/stream` returns `text/event-stream` for authenticated users.
  - Supports user-specific emit, broadcasting, heartbeat comments, and auto-cleanup on client disconnect.
  - `socketService.emitToUser` also pushes to SSE clients, so notifications reach Socket.IO, `ws`, and SSE users.

## Event Bus

- `utils/event-bus.ts` is a production-grade, strongly typed `EventEmitter` wrapper for application-level, event-driven side effects.
- Features:
  - Type-safe `emit` / `on` / `once` / `off` using the shared `EventMap` interface.
  - Fire-and-forget `emit` schedules handlers asynchronously and isolates errors.
  - `emitAndWait` awaits all handlers and still isolates errors.
  - Built-in metrics (`emitted`, `handled`, `failed`) per event type.
- `events/index.ts` registers all handlers at app startup (controlled by `EVENT_BUS_ENABLED`).
- Existing handlers:
  - `user.created` — enqueues a welcome email.
  - `user.updated` / `user.deleted` — audit logging.
  - `task.created` — audit logging.
  - `task.assigned` — creates an in-app notification and enqueues it for delivery.
  - `project.created` — audit logging.
- Domain services emit events **in addition to** their existing logic, so no existing code paths are replaced:
  - `userService.create/update/remove`
  - `taskService.create/update`
  - `projectService.create`

├── routes/
│   └── sse.routes.ts
│
├── controllers/
│   └── sse.controller.ts
│
├── utils/
│   ├── ApiError.ts
│   ├── ApiResponse.ts
│   ├── asyncHandler.ts
│   ├── constants.ts
│   ├── helpers.ts
│   ├── pagination.ts
│   ├── query-optimizer.ts
│   ├── index-manager.ts
│   ├── aggregation.ts
│   ├── transaction.ts
│   ├── compensating-transaction.ts
│   └── accessControl.ts
│
├── tests/
│   ├── auth.test.ts
│   ├── user.test.ts
│   ├── team.test.ts
│   ├── project.test.ts
│   └── task.test.ts
│
├── app.ts
└── server.ts
```
