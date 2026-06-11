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

Each main feature module should include controller, service, repository, routes, validation, and model files. Auth also includes `auth.utils.js`.

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
