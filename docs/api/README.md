# API reference

Interactive documentation is served by the running server:

| URL | Description |
|-----|-------------|
| `/api/docs` | Swagger UI |
| `/api/docs.json` | OpenAPI 3 document (JSON) |

Canonical source: [`../openapi.yaml`](../openapi.yaml).

## Base URL

The OpenAPI spec uses relative server `/api`, so Swagger targets **whatever host** is serving the docs (e.g. `https://msp-miu.tech/api` in production).

Paths are relative to that base (e.g. `/auth/login`).

## Authentication

1. In Swagger UI, run `POST /auth/login` with `university_id` and `password`.
2. On success, the JWT is applied to **Authorize** automatically (also persisted across refresh).
3. Call protected endpoints — the `Authorization: Bearer …` header is sent for you.

You can still open **Authorize** manually if needed. Login via `/users/login` is captured the same way.

## Conventions

- Success bodies often include `{ success: true, data: ... }` or domain-specific shapes.
- Errors typically `{ success: false, error: "message" }` with `401` / `403` / `404` / `500`.
- Season-scoped lists accept `season_id` / `season`: omit/`current`, numeric id, or `all`.
- Pagination where supported: `page`, `limit`.
- File uploads use `multipart/form-data`.

## Route groups (tags)

Auth, Users, Applications, Announcements, Board, Sponsors, Departments, SiteContent, Members, Attendance, Events, Competitions, CompetitionAnnouncements, Teams, Submissions, Quizzes, QuizAttempts, Evaluation, Cloud, Upload, Admin, Suggestions, Seasons, EmailTemplates, AndroidApp.

Mount map: [`server/server.js`](../../server/server.js).

## Updating the spec

When adding or changing routes:

1. Update the corresponding router under `server/routes/`.
2. Mirror the change in `docs/openapi.yaml` (method, path, summary, security, main params).
3. Restart the server and confirm `/api/docs`.
