# Current Status

## Stage

Production-ready API backend. All core modules implemented, 114 tests passing.

## What Exists

### Modules
- **auth** — Local register/login, JWT token rotation, OAuth2 (Google + GitHub), logout/blacklist
- **users** — CRUD with self-or-admin access controls, role-restricted updates
- **teams** — CRUD with owner enforcement, member management (owner/admin only)
- **projects** — CRUD scoped to owner/team membership, auto-assigned `ownerId`
- **tasks** — CRUD scoped to creator/assignee, auto-assigned `createdBy`
- **comments** — Basic structure present
- **notifications** — Queue-based delivery with in-app + email channels

### Infrastructure
- MongoDB connection with Mongoose models
- Redis for caching, token blacklisting, rate limiting, and job queues
- Custom rate limiter with IETF Draft-7 + legacy headers, fails open on Redis loss
- Structured logging (Winston) with request correlation IDs
- Email service with SMTP fallback to mock logging
- Storage service with local filesystem (S3 placeholder)
- Background jobs: email, notification, reminder (cron-based with DLQ)

### Security
- Helmet with API-appropriate CSP
- Explicit CORS with preflight caching
- JWT access + refresh tokens with JTI blacklisting
- bcryptjs password hashing (12 rounds) via Mongoose pre-save hook
- RBAC ownership checks enforced in controllers and services
- Sanitized request bodies (forged `ownerId`, `createdBy`, `role` stripped)

## Next Steps

- Add integration tests for RBAC edge cases (cross-user access attempts)
- Implement manager role permissions (currently defined but unused)
- Add HATEOAS / content negotiation (noted as missing)
- Add notification POST endpoint restrictions (currently any auth user can create for any user)

## Risks or Unknowns

- Manager role has zero permission references; needs definition or removal
- Notification creation endpoint may allow forged `userId` targeting
- Redis test `getOrSet` intermittently fails (pre-existing race condition / mock timing)
