# API reference

Interactive documentation is served by the running server:

| URL | Description |
|-----|-------------|
| `/api/docs` | Swagger UI |
| `/api/docs.json` | OpenAPI 3 document (JSON) |

Canonical source: [`../openapi.yaml`](../openapi.yaml).

## Base URL

Swagger uses production: `https://msp-miu.tech/api`.

Paths are relative to that base — e.g. login is **`POST https://msp-miu.tech/api/auth/login`** (note the `/api` prefix).

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

On every **git commit**, a pre-commit hook runs `npm run docs:openapi`, which regenerates [`docs/openapi.yaml`](../openapi.yaml) from Express mounts in `server/server.js` and `server/routes/*`, then stages the file.

Manually:

```bash
npm run docs:openapi
```

Install hooks after clone (also runs via `npm prepare`):

```bash
node scripts/install-git-hooks.js
```

Existing operation summaries, descriptions, request bodies, and responses are **preserved** when the same path+method still exists. New routes get stub summaries; removed routes are dropped from the spec.

When changing routes, commit as usual — OpenAPI updates with the commit. Restart the server (or redeploy) so `/api/docs` serves the new file.