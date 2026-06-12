# Tasks and Open Questions

## Completed Tasks

- [x] Create `src/` folder structure and all module scaffolding
- [x] Implement auth module (local JWT + OAuth2 Google/GitHub)
- [x] Implement users, teams, projects, tasks modules with full CRUD
- [x] Add validation layer (Zod) for env, request bodies, query params
- [x] Add shared middleware (auth, role, validate, error, rate limit, upload)
- [x] Add services (email, storage, redis, token, socket)
- [x] Add background jobs (email, notification, reminder) with retry + DLQ
- [x] Add test suite (114 tests passing)
- [x] Implement rate limiting with IETF Draft-7 + legacy headers
- [x] Fix Helmet config for API usage (remove HTML CSP)
- [x] Enhance CORS with explicit headers and preflight cache
- [x] Add semantic versioning scripts and dependency management docs
- [x] **RBAC security fixes** — ownership checks, forged-ID prevention, role escalation prevention across all modules
- [x] Implement API key authentication (generate, validate, revoke, middleware integration)
- [x] Implement production-grade database migrations and seeding
- [x] Implement production-grade transactions and rollbacks

## Open Tasks

- [ ] Define and implement `manager` role permissions (currently unused)
- [ ] Add integration tests for RBAC edge cases (cross-user update/delete attempts)
- [ ] Restrict notification POST endpoint (currently any auth user can target any `userId`)
- [ ] Add HATEOAS links to API responses
- [ ] Add content negotiation support
- [ ] Add scope-based authorization middleware for API keys
- [ ] Fix pre-existing Redis `getOrSet` test race condition

## Open Questions

- Should `manager` be able to CRUD team projects but not system-wide users?
- Should notifications be creatable only by admins/system, or should users self-notify?
