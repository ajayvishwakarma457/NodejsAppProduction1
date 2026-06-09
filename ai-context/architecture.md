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

1. Request enters through `app.js` and route registration.
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
│   ├── db.js
│   ├── redis.js
│   ├── env.js
│   └── logger.js
│
├── modules/
│   ├── auth/
│   │   ├── auth.controller.js
│   │   ├── auth.service.js
│   │   ├── auth.repository.js
│   │   ├── auth.routes.js
│   │   ├── auth.validation.js
│   │   └── auth.utils.js
│   │
│   ├── users/
│   │   ├── user.controller.js
│   │   ├── user.service.js
│   │   ├── user.repository.js
│   │   ├── user.routes.js
│   │   ├── user.validation.js
│   │   └── user.model.js
│   │
│   ├── teams/
│   │   ├── team.controller.js
│   │   ├── team.service.js
│   │   ├── team.repository.js
│   │   ├── team.routes.js
│   │   ├── team.validation.js
│   │   └── team.model.js
│   │
│   ├── projects/
│   │   ├── project.controller.js
│   │   ├── project.service.js
│   │   ├── project.repository.js
│   │   ├── project.routes.js
│   │   ├── project.validation.js
│   │   └── project.model.js
│   │
│   ├── tasks/
│   │   ├── task.controller.js
│   │   ├── task.service.js
│   │   ├── task.repository.js
│   │   ├── task.routes.js
│   │   ├── task.validation.js
│   │   └── task.model.js
│   │
│   ├── comments/
│   │   ├── comment.controller.js
│   │   ├── comment.service.js
│   │   ├── comment.repository.js
│   │   ├── comment.routes.js
│   │   ├── comment.validation.js
│   │   └── comment.model.js
│   │
│   └── notifications/
│       ├── notification.controller.js
│       ├── notification.service.js
│       ├── notification.repository.js
│       ├── notification.routes.js
│       ├── notification.validation.js
│       └── notification.model.js
│
├── middleware/
│   ├── auth.middleware.js
│   ├── role.middleware.js
│   ├── validate.middleware.js
│   ├── error.middleware.js
│   ├── rateLimit.middleware.js
│   └── upload.middleware.js
│
├── services/
│   ├── email.service.js
│   ├── storage.service.js
│   ├── redis.service.js
│   ├── token.service.js
│   └── socket.service.js
│
├── jobs/
│   ├── email.job.js
│   ├── reminder.job.js
│   ├── notification.job.js
│   └── index.js
│
├── sockets/
│   ├── index.js
│   ├── task.socket.js
│   ├── notification.socket.js
│   └── team.socket.js
│
├── utils/
│   ├── ApiError.js
│   ├── ApiResponse.js
│   ├── asyncHandler.js
│   ├── constants.js
│   ├── helpers.js
│   └── pagination.js
│
├── tests/
│   ├── auth.test.js
│   ├── user.test.js
│   ├── team.test.js
│   ├── project.test.js
│   └── task.test.js
│
├── app.js
└── server.js
```
