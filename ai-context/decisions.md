# Decisions

## Decision Log

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
- New tests in `src/tests/api-key.test.ts` and additional middleware tests in `src/tests/auth-middleware.test.ts`.

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
- Added `src/tests/utils/distributed-lock.test.ts` covering successful lock acquisition, skip-when-held behavior, and single execution under concurrency.

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

- `src/utils/queue.ts` extended with priority support and `src/tests/utils/queue.test.ts` added.
- `src/jobs/report.job.ts` enqueue signature now accepts `priority`.
- `src/tests/bullmq.test.ts` includes a prioritized job test.
