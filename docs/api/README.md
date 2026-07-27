# API reference

Interactive documentation is served by the running server:

| URL | Description |
|-----|-------------|
| `/api/docs` | Swagger UI |
| `/api/docs.json` | OpenAPI 3 document (JSON) |

Canonical source: [`../openapi.yaml`](../openapi.yaml).

## Base URL

| Environment | Base |
|-------------|------|
| Local | `http://localhost:3000/api` |
| Production | `https://msp-miu.tech/api` |

Paths in the OpenAPI file are relative to that base (e.g. `/auth/login`).

## Authentication

1. `POST /auth/login` with `university_id` and `password`.
2. Copy the returned JWT.
3. In Swagger UI, click **Authorize** and enter `Bearer <token>` or just the token (UI may add Bearer).
4. Call protected endpoints.

Header format used by the app:

```http
Authorization: Bearer eyJhbGciOi...
```

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
