# Decisions

## Decision Log

## 2026-06-14 - Add Morgan as an Optional HTTP Request Logger

Decision:

Add `morgan` as an optional, production-grade HTTP request logger that can be enabled via `HTTP_LOGGER=morgan`. The existing Winston-based structured request logger remains the default so no existing behavior changes.

Reason:

Some teams and logging pipelines expect Apache-style HTTP access logs. Morgan is a battle-tested middleware for this purpose. Making it configurable keeps the existing logger intact while providing a standard alternative.

Rules:

- Default HTTP logger remains `winston` (`HTTP_LOGGER=winston`).
- Set `HTTP_LOGGER=morgan` to use Morgan instead.
- Morgan output is streamed to the Winston logger so all logs follow the same transports and formatting policy.
- Format is configurable via `MORGAN_FORMAT` (default `combined`); a custom `json` format is also registered for structured output.
- Custom Morgan tokens expose `requestId` and `userId` for request correlation.
- Health check requests (`/health`) are skipped by default (`MORGAN_SKIP_HEALTH_CHECK=true`).
- Immediate logging (before response finishes) can be enabled via `MORGAN_IMMEDIATE=true`.

Impact:

- New `src/middleware/morgan.middleware.ts` with Morgan configuration and Winston stream integration.
- `src/config/env.ts` extended with `HTTP_LOGGER`, `MORGAN_FORMAT`, `MORGAN_SKIP_HEALTH_CHECK`, and `MORGAN_IMMEDIATE`.
- `src/app.ts` conditionally mounts either the Morgan middleware or the existing Winston request logger based on `HTTP_LOGGER`.
- `.env.example` updated with the new variables.
- New `src/tests/unit/middleware/morgan.middleware.test.ts` covering token registration, format registration, stream routing, skip behavior, and env option propagation.

## 2026-06-14 - Adopt Winston for Structured Logging

Decision:

Replace the custom console logger with `winston` for production-grade structured logging. Logs are emitted as JSON by default and written to rotating files in production. Pretty colorized output is available by setting `LOG_FORMAT=pretty`.

Reason:

Winston provides transport flexibility, syslog-level filtering, exception/rejection capture, and JSON serialization (including Error stacks) out of the box. The previous custom logger was JSON-shaped but lacked rotation and robust error serialization.

Impact:

- `src/config/logger.ts` now builds a Winston logger with Console and DailyRotateFile transports.
- `LOG_FORMAT` (`pretty` | `json`) added to `src/config/env.ts`; defaults to `json`.
- Existing `logger.debug/info/warn/error` API remains unchanged; call sites do not need updates.
- Unit tests in `src/tests/unit/config/logger.test.ts` mock Winston to verify behavior.

## 2026-06-09 - Use Feature-Based Source Structure

Decision:

Use `src/modules` for domain features and separate shared concerns into `config`, `middleware`, `jobs`, `sockets`, `services`, and `utils`.

Reason:

This keeps the backend easier to scale and easier for AI tools to understand by responsibility.

Impact:

New features should follow the same module pattern and avoid mixing shared infrastructure into feature folders.

## 2026-06-09 - Add Explicit File Roles Per Module

Decision:

Each main feature module should include controller, service, repository, routes, validation, and model files. Auth also includes `auth.utils.ts`.

Reason:

This makes responsibilities predictable and easier to scale across modules.

Impact:

New feature folders should follow the same convention unless there is a strong reason to simplify.

## 2026-06-11 - Semantic Versioning & Dependency Management Strategy

Decision:

Adopt a strict semver workflow with automated patch updates, reviewed minor updates, and tested major updates.

Reason:

Production stability requires reproducible builds (locked via `package-lock.json`) while still receiving security and bug fixes automatically.

Rules:

- **Lock versions in production**: `package-lock.json` is enforced via `.npmrc` (`package-lock=true`). Deployments use `npm ci`.
- **Auto-update PATCH**: `npm run deps:update:patch` runs `ncu --target patch -u && npm install`. Patch updates (bug/security fixes) are applied automatically.
- **Review MINOR**: `npm run deps:check:minor` lists minor updates. Apply with `npm run deps:update:minor` after code review.
- **Test MAJOR**: `npm run deps:check:major` lists major updates. Apply with `npm run deps:update:major` only after testing in a branch.
- **Tag releases**: `npm run version:patch|minor|major` bumps `package.json`, runs `npm run ci` (via `preversion`), commits, tags (`vX.Y.Z`), and pushes.

Impact:

- `npm-check-updates` added as a dev dependency.
- `.npmrc` enforces `package-lock=true` and `engine-strict=true`.
- New npm scripts added for dependency management and versioning.

## 2026-06-11 - Keep Custom Rate Limiter Over express-rate-limit

Decision:

Retain the existing custom Redis-backed rate limiter instead of replacing it with `express-rate-limit`.

Reason:

Swapping middleware would require rewriting all 9+ rate-limit tests due to signature differences. The custom implementation is production-grade with equivalent features (dual headers, Retry-After, fails-open).

Impact:

- `express-rate-limit` remains installed but unused.
- Rate limiting continues to use the custom middleware with IETF Draft-7 + legacy header support.

## 2026-06-11 - OAuth Account Linking by Email

Decision:

When a user signs in via Google or GitHub, link to an existing local account if the email matches. If no account exists, create a new OAuth-only user.

Reason:

Prevents duplicate accounts and provides backward compatibility with local auth.

Impact:

- `oauthService.findOrCreate` handles both linking and creation.
- Passport strategies normalize profiles into a common `OAuthProfile` shape.

## 2026-06-11 - RBAC Ownership Enforcement Pattern

Decision:

Enforce ownership and role checks in both controllers and services using a shared `accessControl.ts` utility. Auto-inject `req.user.id` for ownership fields and strip forged client fields before validation reaches the service layer.

Reason:

- Prevents critical vulnerabilities where any authenticated user could update/delete any resource.
- Prevents privilege escalation (e.g., self-promotion to admin via forged `role`).
- Centralizes access logic for consistency across modules.

Rules:

- **Users**: Admin-only list/create/delete. Self-or-admin get/update. Non-admins cannot change `role`.
- **Teams**: Owner-only update/delete/member-management. Scoped list (owned or member of).
- **Projects**: Owner-only update/delete. Scoped list (owned or team member). `ownerId` injected server-side.
- **Tasks**: Creator or assignee access. Scoped list (created by or assigned to). `createdBy` injected server-side.
- **Validation**: Remove forgeable fields (`ownerId`, `createdBy`) from Zod schemas.

Impact:

- `src/utils/accessControl.ts` created with `isOwnerOrAdmin`, `setUserId`, `sanitizeBody`.
- All module controllers, services, routes, and validation schemas updated.

## 2026-06-11 - API Key Authentication

Decision:

Add production-grade API key authentication as a secondary credential type alongside JWT Bearer tokens. API keys are scoped, expirable, revocable, and stored only as bcrypt hashes.

Reason:

- Service-to-service and programmatic access often requires long-lived credentials that JWT session tokens are not designed for.
- Separating API keys from user passwords and JWT tokens limits blast radius: a leaked API key can be revoked without resetting passwords or invalidating all sessions.
- Storing only hashes and returning plaintext keys exactly once prevents accidental exposure in database dumps or logs.

Rules:

- **Key format**: `npak_<publicId>_<secret>` with a configurable prefix. Public ID enables O(1) lookup; secret is verified with bcrypt.
- **Storage**: Only the bcrypt hash, public ID, and metadata are persisted. Plaintext keys are returned only at creation.
- **Ownership**: Keys belong to a single user and inherit that user's role at creation time (fixed permissions).
- **Lifecycle**: Keys support expiration (TTL index), revocation, and a per-user active key limit.
- **Authentication order**: `authMiddleware` attempts Bearer JWT first, then falls back to the configured API key header (`X-API-Key` by default).
- **Rate limiting**: API-key-authenticated requests are treated as authenticated users.
- **Scopes**: Keys carry scopes (`read`, `write`, `admin`) for future fine-grained authorization.

Impact:

- New `api-keys` module under `src/modules/api-keys/` with model, repository, service, controller, routes, and validation.
- `src/middleware/auth.middleware.ts` extended to support API keys and track `req.authType`.
- `src/types/express.d.ts` extended with `authType`.
- `src/config/env.ts` extended with API key configuration.
- New environment variables added to `.env.example`.
- New tests in `src/tests/unit/api-key.test.ts` and additional middleware tests in `src/tests/unit/auth-middleware.test.ts`.

## 2026-06-12 - Use Redis Distributed Locks for Cron Jobs

Decision:

Wrap every legacy node-cron job (`email`, `notification`, `reminder`) with a Redis-based distributed lock so only one server instance executes a given scheduled job per tick.

Reason:

In multi-instance deployments, cron jobs scheduled on every node would otherwise run duplicate work, send duplicate emails/notifications, and enqueue duplicate reminders. Redis SET NX EX provides a simple, safe lock primitive already available through `redisService.lock()`.

Rules:

- Use `utils/distributed-lock.ts` helpers (`withDistributedLock`, `createLockedCronHandler`) with the `cron` namespace.
- Lock TTL defaults to `env.CRON_JOB_LOCK_TTL_SECONDS` (default 60s) and can be overridden per handler.
- Each job uses a unique lock key matching its job name (`email-job`, `notification-job`, `reminder-job`).
- Keep the change additive: existing `node-cron`, custom queue, and BullMQ code is not replaced.
- Release the lock in a `finally` block; the key auto-expires if release fails, preventing permanent deadlocks.

Impact:

- `email.job.ts`, `notification.job.ts`, and `reminder.job.ts` now schedule locked handlers.
- Added `src/tests/unit/utils/distributed-lock.test.ts` covering successful lock acquisition, skip-when-held behavior, and single execution under concurrency.

## 2026-06-12 - Add Optional Job Priorities Without Replacing the Legacy Queue

Decision:

Add optional job priority support to the existing custom Redis queue and to BullMQ, while keeping the legacy list-based FIFO behavior intact for jobs that do not specify a priority.

Reason:

Some background work is more urgent than others (e.g., password-reset emails vs. bulk newsletters). Priorities let operators control processing order without discarding the existing simple queue implementation or migrating everything to BullMQ.

Rules:

- Lower priority numbers = higher priority (matching BullMQ semantics).
- Legacy queue (`utils/queue.ts`):
  - Add an optional `priority?: number` to `QueueItem` and `enqueue(payload, id?, priority?)`.
  - Store prioritized jobs in a new Redis sorted set (`queue:{name}:priority`).
  - Keep non-priority jobs in the existing Redis list (`queue:{name}`) for unchanged FIFO behavior.
  - `dequeue()` checks the priority sorted set first, then falls back to the FIFO list.
  - `size()`, `peek()`, `requeue()`, and `clear()` include the priority set.
- BullMQ (`services/bullmq.service.ts` / `jobs/report.job.ts`):
  - Expose BullMQ’s native `priority` option in `reportQueue.enqueue()`.
- Do not change existing enqueue calls or retry/DLQ behavior.

Impact:

- `src/utils/queue.ts` extended with priority support and `src/tests/unit/utils/queue.test.ts` added.
- `src/jobs/report.job.ts` enqueue signature now accepts `priority`.
- `src/tests/unit/bullmq.test.ts` includes a prioritized job test.

## 2026-06-12 - Add a Production-Grade Typed Event Bus

Decision:

Introduce a centralized, typed `EventEmitter` event bus for application-level event-driven side effects without changing existing service logic.

Reason:

Decoupling side effects (emails, notifications, audit logs) from core CRUD operations makes the codebase easier to extend and reduces the risk of blocking request handlers with non-critical work.

Rules:

- Implement the bus in `utils/event-bus.ts` with a strongly typed `EventMap`.
- Provide `emit` (fire-and-forget, schedules handlers asynchronously) and `emitAndWait` (awaits handlers).
- Isolate handler errors so one failing handler does not break others or the caller.
- Track per-event metrics (`emitted`, `handled`, `failed`).
- Register handlers via `events/index.ts` and wire it into `server.ts` startup when `EVENT_BUS_ENABLED` is true.
- Keep changes additive:
  - Services call `eventBus.emit(...)` after existing logic succeeds.
  - No existing functions are replaced or refactored.

Impact:

- New `src/utils/event-bus.ts`, `src/events/index.ts`, and `src/events/handlers/*`.
- `userService`, `taskService`, and `projectService` now emit domain events.
- `src/config/env.ts` and `.env.example` extended with `EVENT_BUS_ENABLED`.
- Added `src/tests/unit/utils/event-bus.test.ts` covering listeners, async handlers, error isolation, once, unsubscribe, and metrics.

## 2026-06-12 - Add Socket.IO Namespaces Additively

Decision:

Add Socket.IO namespaces (`/tasks`, `/teams`, `/notifications`) alongside the existing default namespace, without removing or changing the existing room/broadcast behavior.

Reason:

Namespaces let clients subscribe only to the realtime channels they care about and give the server a cleaner separation of concerns. Keeping the default namespace intact preserves backward compatibility for existing clients.

Rules:

- Keep `sockets/index.ts` default namespace unchanged except for extracting reusable auth logic and joining the per-user notification room (a fix that enables push notifications on the default namespace).
- Add `sockets/namespaces/index.ts` that registers `/tasks`, `/teams`, and `/notifications` namespaces.
- Reuse existing `registerTaskSocket`, `registerTeamSocket`, and `registerNotificationSocket` handlers by widening their `io` parameter type to `Server | Namespace`.
- Add `socketService.emitToNamespace(namespace, room, event, data)` and `socketService.emitToUser(userId, event, data)` for cross-namespace broadcasting.
- Update `notificationJob` socket delivery to use `emitToUser` so both default-namespace and `/notifications` namespace clients receive push notifications.
- Install `socket.io-client` as a dev dependency for namespace integration tests.

Impact:

- New `src/sockets/auth.ts`, `src/sockets/namespaces/*`.
- `src/sockets/task.socket.ts` and `src/sockets/team.socket.ts` now accept `Server | Namespace`.
- `src/services/socket.service.ts` extended with namespace-aware helpers.
- `src/server.ts` calls `initializeNamespaces(io)` after `registerSockets(io)`.
- Added `src/tests/unit/sockets/namespaces.test.ts` covering auth rejection, namespace connection, and user-specific broadcasts on both default and `/notifications` namespaces.

## 2026-06-12 - Add a Lightweight `ws` Server Alongside Socket.IO

Decision:

Add a raw WebSocket server using the `ws` library as an alternative transport, running on its own port so it does not interfere with the existing Socket.IO server.

Reason:

Some clients prefer a lightweight protocol without the Socket.IO fallback/negotiation overhead. Offering both lets consumers choose while keeping Socket.IO untouched.

Rules:

- Run `ws` on a dedicated port (`WS_PORT`, default `3001`). Do not share the HTTP server with Socket.IO to avoid upgrade conflicts.
- Authenticate `ws` connections via query param `?token=` or `sec-websocket-protocol` header using the same JWT access tokens as Socket.IO.
- Support per-user emit, channel subscriptions (`subscribe:<channel>`), broadcasting, and ping/pong heartbeat.
- Integrate with existing push notifications by extending `socketService.emitToUser` to also call `wsService.emitToUser`.
- Keep all Socket.IO code unchanged.
- Add `WS_ENABLED` and `WS_PORT` env vars.
- Install `ws` as a runtime dependency and `@types/ws` as a dev dependency.

Impact:

- New `src/services/ws.service.ts`, `src/ws/index.ts`, `src/ws/helpers.ts`, `src/ws/handlers/message.handler.ts`.
- `src/services/socket.service.ts` `emitToUser` now also pushes to `ws` clients.
- `src/server.ts` starts/stops the `ws` server alongside Socket.IO.
- Added `src/tests/unit/ws/ws.test.ts` covering auth, user emit, channel subscription, and unsubscribed isolation.

## 2026-06-12 - Add Server-Sent Events (SSE) for One-Way Streaming

Decision:

Add an SSE endpoint as a third realtime transport option alongside Socket.IO and `ws`, without modifying either of those.

Reason:

SSE is ideal for one-way server-to-client streaming over standard HTTP (firewall-friendly, auto-reconnect in browsers, simple client API). Some clients prefer it over persistent bidirectional sockets.

Rules:

- Add `GET /api/v1/events/stream` that returns `text/event-stream`.
- Authenticate via the existing JWT middleware (`req.user`).
- Implement `services/sse.service.ts` to track open responses, emit per-user or broadcast events, send heartbeat comments, and clean up on disconnect.
- Integrate with notifications by extending `socketService.emitToUser` to also call `sseService.emitToUser`.
- Keep Socket.IO and `ws` code unchanged.

Impact:

- New `src/services/sse.service.ts`, `src/controllers/sse.controller.ts`, `src/routes/sse.routes.ts`.
- `src/app.ts` mounts `/api/v1/events` SSE routes.
- `src/services/socket.service.ts` `emitToUser` now also pushes to SSE clients.
- Added `src/tests/unit/sse.test.ts` covering connection event, user emit, broadcast, and removal.
