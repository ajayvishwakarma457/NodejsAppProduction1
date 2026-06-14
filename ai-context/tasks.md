# Tasks and Open Questions

## Completed Tasks

- [x] Create `src/` folder structure and all module scaffolding
- [x] Implement auth module (local JWT + OAuth2 Google/GitHub)
- [x] Implement users, teams, projects, tasks modules with full CRUD
- [x] Add validation layer (Zod) for env, request bodies, query params
- [x] Add shared middleware (auth, role, validate, error, rate limit, upload)
- [x] Add services (email, storage, redis, token, socket)
- [x] Implement production-grade AWS S3 storage provider with SDK v3, presigned URLs, and tests
- [x] Add large-file streaming endpoint with HTTP Range support
- [x] Add direct-to-S3 multipart upload endpoints for resumable large uploads
- [x] Add Sharp-based image processing with on-upload resize, format conversion, and variant generation
- [x] Add BullMQ integration alongside the legacy queue for new background job features
- [x] Add background jobs (email, notification, reminder) with retry + DLQ
- [x] Add test suite (unit + integration tests passing via Vitest and Supertest)
- [x] Expand integration test coverage to all API modules (health, auth, users, teams, projects, tasks, comments, notifications, files, SSE)
- [x] Implement rate limiting with IETF Draft-7 + legacy headers
- [x] Fix Helmet config for API usage (remove HTML CSP)
- [x] Enhance CORS with explicit headers and preflight cache
- [x] Add semantic versioning scripts and dependency management docs
- [x] **RBAC security fixes** — ownership checks, forged-ID prevention, role escalation prevention across all modules
- [x] Implement API key authentication (generate, validate, revoke, middleware integration)
- [x] Implement production-grade database migrations and seeding
- [x] Implement production-grade transactions and rollbacks
- [x] Implement production-grade indexing strategies and query optimization
- [x] Implement production-grade MongoDB aggregation pipelines and dashboard endpoints
- [x] Implement production-grade Redis fundamentals (strings, hashes, sorted sets, TTL) with helper methods and tests
- [x] Implement cache-aside pattern for entity reads across users, teams, projects, and tasks with invalidation on writes
- [x] Add Redis distributed locks for all node-cron jobs (email, notification, reminder) so only one instance executes each scheduled job
- [x] Add job priority support to the legacy custom queue and BullMQ report queue (additive; lower number = higher priority)
- [x] Add production-grade, typed event bus for application-level event-driven patterns (additive; services emit domain events without replacing existing logic)
- [x] Extend Socket.IO layer with additive namespaces (`/tasks`, `/teams`, `/notifications`) alongside existing rooms/broadcasting
- [x] Add lightweight raw WebSocket (`ws`) server as an alternative transport alongside Socket.IO
- [x] Add Server-Sent Events (SSE) endpoint for one-way streaming, integrated with notification delivery

## Open Tasks

- [ ] Define and implement `manager` role permissions (currently unused)
- [x] Add integration tests for RBAC edge cases (cross-user update/delete attempts) — implemented in `src/tests/integration/users.test.ts`
- [ ] Restrict notification POST endpoint (currently any auth user can target any `userId`)
- [ ] Add HATEOAS links to API responses
- [ ] Add content negotiation support
- [ ] Add scope-based authorization middleware for API keys
- [ ] Fix pre-existing Redis `getOrSet` test race condition
- [x] Fix OAuth provider index to allow multiple local users (uncovered by integration tests)
- [x] Fix password hashing for updates via `findByIdAndUpdate` (uncovered by integration tests)
- [x] Add response serializers for team/project/task/comment/notification services so HTTP responses use `id` consistently
- [x] Persist local-storage mimetype metadata via sidecar JSON so file streaming returns correct `Content-Type`- [ ] Extend cache-aside to list endpoints and dashboard aggregations (currently only `getById` is cached)

## Open Questions

- Should `manager` be able to CRUD team projects but not system-wide users?
- Should notifications be creatable only by admins/system, or should users self-notify?
