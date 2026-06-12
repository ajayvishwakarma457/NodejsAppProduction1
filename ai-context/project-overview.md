# Project Overview

## Name

NodejsAppProduction1

## Purpose

Production-grade Node.js API backend for team/project/task management. Supports multi-tenant teams, project tracking, task assignment, real-time notifications, and background job processing.

## Tech Stack

- **Runtime**: Node.js >= 18.0.0, TypeScript 5.6.2
- **Framework**: Express 4.x with typed Request/Response augmentation
- **Database**: MongoDB (Mongoose ODM)
- **Cache/Queues**: Redis (ioredis)
- **Auth**: JWT Bearer tokens (access 15m + refresh 7d with rotation), OAuth2 (Google, GitHub)
- **Validation**: Zod (env, request bodies, query params)
- **File Uploads**: Multer (memoryStorage) → storageService (local filesystem / AWS S3) with optional Sharp image processing and variant generation
- **Realtime**: Socket.IO
- **Background Jobs**: Node-cron + Redis-backed queues (email, notification, reminder)
- **Security**: Helmet, CORS, bcryptjs (12 rounds), custom Redis-backed rate limiting

## Main Goals

- Scalable feature-module architecture with clear boundaries
- Secure RBAC enforcement (admin, manager, member roles)
- Real-time collaboration via WebSockets
- Resilient background job processing with retry and DLQ
- Production-ready observability (structured logging, request IDs)

## Constraints

- Structure stays easy for AI tools and developers to navigate
- Shared services and middleware remain centralized
- All endpoints versioned under `/api/v1/`
