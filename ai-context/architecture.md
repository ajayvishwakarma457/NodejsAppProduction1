# Architecture

## High Level

The backend uses a feature-module structure under `src/modules`, with shared infrastructure placed in dedicated folders for config, middleware, jobs, sockets, services, and utilities.

## Main Modules

- `auth`
- `users`
- `teams`
- `projects`
- `tasks`
- `comments`
- `notifications`

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
│   └── logger.ts
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
│   └── pagination.ts
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
