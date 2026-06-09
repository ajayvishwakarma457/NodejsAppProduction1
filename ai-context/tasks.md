# Tasks and Open Questions

## Priority Tasks

- Create the `src/` folder structure in the repository
- Decide the app framework setup in `app.js` and `server.js`
- Implement the `auth` module first
- Define database models and repository patterns
- Add shared validation, upload, role, token, and socket infrastructure
- Add test setup under `src/tests`

## Open Questions

- Will this backend use Express?
- Which database will `config/db.js` connect to?
- Will Redis be used for cache, queues, sessions, or all three?
- What notification channels are required besides sockets?
- Which upload/storage provider will `upload.middleware.js` and `storage.service.js` use?
  **Resolved 2026-06-09:** Local filesystem by default (`STORAGE_PROVIDER=local`), with an S3 placeholder. Multer handles uploads; `storage.service.ts` abstracts provider logic.
