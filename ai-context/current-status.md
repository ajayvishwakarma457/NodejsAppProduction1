# Current Status

## Stage

Production-ready API backend. All core modules implemented, 248 tests passing.

## What Exists

### Modules
- **auth** — Local register/login, JWT token rotation, OAuth2 (Google + GitHub), logout/blacklist, API key authentication
- **users** — CRUD with self-or-admin access controls, role-restricted updates
- **teams** — CRUD with owner enforcement, member management (owner/admin only)
- **projects** — CRUD scoped to owner/team membership, auto-assigned `ownerId`
- **tasks** — CRUD scoped to creator/assignee, auto-assigned `createdBy`
- **comments** — Basic structure present
- **notifications** — Queue-based delivery with in-app + email channels

### Infrastructure
- MongoDB connection with Mongoose models
- Redis for caching, token blacklisting, rate limiting, and job queues, now with a production-grade service wrapper covering strings (set/get/JSON/cache-aside/counters/locks/pattern delete), hashes (hSet/hSetMultiple/hGet/hGetAll/hDel/hExists/hIncrBy/hKeys/hLen), sorted sets (zAdd/zAddJSON/zRange/zRevRange/zRank/zScore/zCount/zCard/zIncrBy/zRemRangeByScore), and TTL helpers (ttl/persist)
- Cache-aside pattern implemented at the domain level for `users`, `teams`, `projects`, and `tasks` entity reads (`getById`) with namespace-scoped invalidation on creates/updates/deletes/member changes via `src/utils/cache.ts`
- Production-grade database migrations with locking, batching, transactions (with fallback), and rollback
- Environment-aware database seeders with idempotent seeds and execution tracking
- Reusable MongoDB transaction helper with replica-set detection and standalone fallback
- Compensating transaction (saga) utility for cross-system rollback
- Multi-document service operations wrapped in transactions with cascade deletes
- Production-grade indexing strategy with named MongoDB indexes and query optimization utilities (`query-optimizer`, `index-manager`)
- Optimized list/find endpoints across all repositories using projections, pagination, and slow-query logging
- Production-grade MongoDB aggregation pipelines with safety guards (maxTimeMS, allowDiskUse, read-only sanitization), `$facet` pagination, date grouping helpers, and dashboard endpoints for projects, tasks, and notifications
- Custom rate limiter with IETF Draft-7 + legacy headers, fails open on Redis loss
- Structured logging (Winston) with request correlation IDs
- Email service with SMTP fallback to mock logging
- Storage service with provider pattern: local filesystem and production-grade AWS S3 (SDK v3) with upload, delete, exists, metadata, stream, public URL, presigned URL, and multipart upload support
- File streaming endpoint (`GET /api/v1/files/:key/stream`) with HTTP Range request support for both local and S3 storage
- Direct-to-S3 multipart upload endpoints (`/api/v1/files/multipart/*`) for large/resumable uploads
- Image processing with Sharp: uploaded images are resized, converted, and auto-generate configured variants (master + thumbnail/medium/large) when `IMAGE_PROCESSING_ENABLED=true`
- Background jobs: email, notification, reminder (cron-based with DLQ)
- Distributed scheduler locks for all cron jobs (`utils/distributed-lock.ts`) so only one app instance executes each job per tick; locks use Redis SET NX EX with configurable `CRON_JOB_LOCK_TTL_SECONDS`
- Job priorities: legacy custom queue (`utils/queue.ts`) supports an optional `priority` number (lower = higher priority) via a Redis sorted set while keeping the existing FIFO list behavior for unprioritized jobs; BullMQ report queue also exposes `priority`
- Production-grade, typed event bus (`utils/event-bus.ts`) for application-level EventEmitter patterns; handlers wired at startup (`events/index.ts`) and services emit domain events (`user.created`, `user.updated`, `user.deleted`, `task.created`, `task.assigned`, `project.created`) without changing existing business logic
- Socket.IO realtime layer with JWT auth, rooms (task/team/notification), broadcasting, and additive namespaces (`/tasks`, `/teams`, `/notifications`) alongside the default namespace
- Lightweight raw WebSocket server (`ws`) running on its own port (`WS_PORT`) as an alternative to Socket.IO; supports JWT auth, user-specific emit, channel subscriptions, heartbeat, and broadcasts to both Socket.IO and `ws` clients from `socketService.emitToUser`
- BullMQ integration added alongside the legacy custom queue for new features, including a sample `report-generation` queue/worker with retries, backoff, delayed jobs, and deduplication

### Security
- Helmet with API-appropriate CSP
- Explicit CORS with preflight caching
- JWT access + refresh tokens with JTI blacklisting
- API key authentication with bcrypt-hashed keys, scopes, expiration, and per-user limits
- bcryptjs password hashing (12 rounds) via Mongoose pre-save hook
- RBAC ownership checks enforced in controllers and services
- Sanitized request bodies (forged `ownerId`, `createdBy`, `role` stripped)

## Next Steps

- Add integration tests for RBAC edge cases (cross-user access attempts)
- Implement manager role permissions (currently defined but unused)
- Add HATEOAS / content negotiation (noted as missing)
- Add notification POST endpoint restrictions (currently any auth user can create for any user)
- Add scope-based authorization middleware to enforce API key scopes beyond role checks

## Risks or Unknowns

- Manager role has zero permission references; needs definition or removal
- Notification creation endpoint may allow forged `userId` targeting
- Redis `getOrSet` has a pre-existing race condition under concurrent loaders; currently stable in tests but should be hardened with locking or Lua-based set-if-absent if concurrent cache misses become likely
- Cache-aside currently covers entity lookups only; list endpoints and dashboard aggregations are not cached yet
