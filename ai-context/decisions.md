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
