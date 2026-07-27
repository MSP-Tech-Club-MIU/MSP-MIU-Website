# Authentication and authorization

## JWT authentication

- Clients send `Authorization: Bearer <token>`.
- Middleware: [`server/middlewares/auth.js`](../server/middlewares/auth.js) (`authenticateToken`, `optionalAuth`).
- Token payload includes user id (`userId` or legacy `id`), role, and related claims.
- Inactive users (`is_active: false`) are rejected.
- Default expiry: `JWT_EXPIRES_IN` (e.g. `24h`).
- Frontend stores the token in `localStorage.authToken` via `ApiService`.

### Auth endpoints

Primary surface: `/api/auth/*` (login, register, activate, verify-activation-token, forgot/reset password, logout).

Legacy/alternate user login/register also exist under `/api/users/*`. Prefer `/api/auth` for new clients.

## User roles

`User.role` ENUM:

| Role | Typical use |
|------|-------------|
| `member` | Activated club member |
| `board` | Board member account |
| `admin` | Elevated role (rare; many admin UI paths use board + `adminAuth` instead) |
| `competitor` | Competition participant |
| `judge` | Can access judging endpoints |

Role checks: `verifyRole(...)`, `authorize(...)`.

## Department soft-gates

Some routes allow **board/admin role OR** a specific `department_id`:

| Area | Pattern |
|------|---------|
| Applications | `verifyRoleOrDepartment(['board','admin'], [5])` — department 5 (HR-style) |
| Attendance | `verifyRoleOrDepartment(['admin','board'], [6])` |
| Client admin UI | Board **or** `department_id === 5` → **registrations-only** access |

## Admin panel gate (`adminAuth`)

File: [`server/middlewares/adminAuth.js`](../server/middlewares/adminAuth.js).

Applied to **all** `/api/admin/*` routes (after `authenticateToken`), plus season mutations and Android publish/notify.

Requires a row in `board` for the current user in the **default season** (`is_default`), with:

- Position `President` or `Vice President`, **or**
- Position `Head` and `department_id` **1** (Software Development) or **2** (Technical Training)

If no default season exists yet, any linked board row is accepted (bootstrap).

Frontend: `ApiService.checkAdminAccess()` probes `GET /api/admin/dashboard`. Full admin vs registrations-only is decided in `AdminPanel.jsx`.

## Judging access (`authorizeJudgingAccess`)

File: [`server/middlewares/judgingAuth.js`](../server/middlewares/judgingAuth.js).

Allowed when:

1. `role` is `admin` or `judge`, **or**
2. `role` is `board` and either:
   - Competition `config.judging.assigned_board_user_ids` includes the user, **or**
   - No assignment list is set and the board member matches `JUDGE_BOARD_POSITIONS` (and optional `JUDGE_BOARD_DEPARTMENT_IDS`)

Used on submission listing/grading and evaluation judge endpoints.

## Optional auth

`optionalAuth` attaches `req.user` when a valid token is present but does not fail anonymous requests (e.g. suggestions, create team, list seasons).

## Security references

See [SECURITY.md](../SECURITY.md) for password hashing, logging, and reporting practices.
