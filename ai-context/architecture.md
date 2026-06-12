# Architecture

## High Level

The backend uses a feature-module structure under `src/modules`, with shared infrastructure placed in dedicated folders for config, middleware, jobs, sockets, services, and utilities.

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

## File Uploads, Streaming & Storage

- `middleware/upload.middleware.ts` uses Multer with `memoryStorage()` for server-side upload handling.
- Production-grade limits are enforced:
  - `STORAGE_MAX_FILE_SIZE_MB` per-file limit
  - max file count, field count, and multipart part limits
  - MIME type allow-list via `STORAGE_ALLOWED_MIME_TYPES`
  - structured `MulterError` → `ApiError` conversion with request context logging
- `services/storage.service.ts` provides a provider-pattern storage abstraction:
  - `LocalStorageProvider` — stores files on disk with directory traversal protection, unique safe filenames, upload/delete/exists/stream/URL.
  - `S3StorageProvider` — production-grade AWS S3 implementation using AWS SDK v3:
    - `PutObjectCommand` for uploads with correct `ContentType`
    - `DeleteObjectCommand`, `HeadObjectCommand`, `GetObjectCommand`
    - multipart upload support (`CreateMultipartUploadCommand`, `UploadPartCommand`, `CompleteMultipartUploadCommand`, `AbortMultipartUploadCommand`)
    - public URL generation (supports virtual-hosted style, custom endpoint, and `S3_PUBLIC_URL`)
    - temporary presigned URLs for private access and multipart part uploads
    - runtime validation of required S3 env vars
    - structured S3 error handling and logging
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
│   ├── token.service.ts
│   └── socket.service.ts
│
├── jobs/
│   ├── email.job.ts
│   ├── reminder.job.ts
│   ├── notification.job.ts
│   └── index.ts
│
├── sockets/
│   ├── index.ts
│   ├── task.socket.ts
│   ├── notification.socket.ts
│   └── team.socket.ts
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
