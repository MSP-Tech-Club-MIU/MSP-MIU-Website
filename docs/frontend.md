# Frontend

React 18 + Vite SPA in [`client/`](../client/). HTTP client is native **`fetch`** in [`client/src/services/api.js`](../client/src/services/api.js) (`ApiService`). Axios is listed in dependencies but unused.

## API base URL

| Environment | Resolution |
|-------------|------------|
| Capacitor native | `VITE_PRODUCTION_API_URL` or `https://msp-miu.tech/api` |
| Production web | `VITE_PRODUCTION_API_URL` or relative `/api` |
| Development web | `VITE_DEVELOPMENT_API_URL` or `http://localhost:3000/api` |

Auth header: `Authorization: Bearer <token>` when `localStorage.authToken` is set. Some GETs use a short in-memory cache (~5 minutes).

## Auth on the client

1. Login → store JWT in `localStorage.authToken`.
2. Pages call `isAuthenticated()` / `getProfile()`; expired tokens are cleared client-side.
3. Activation: `/account-activation?token=…`
4. Reset: forgot-password flow → `/reset-password`
5. No global AuthContext — checks are per page / ApiService helpers.

## Route map

Defined in [`AppRouter.jsx`](../client/src/AppRouter.jsx) (lazy-loaded; most wrapped in `SiteLayout`).

**Public / member**

| Path | Screen |
|------|--------|
| `/` | Home |
| `/about` | About |
| `/Meet-the-board` | Board |
| `/become-member` | Applications |
| `/events`, `/events/:id` | Events |
| `/sponsors` | Sponsors |
| `/privacy` | Privacy Policy (CMS: `privacy_policy`) |
| `/faqs` | FAQs (CMS: `faqs`; editable in Admin → Site content) |
| `/suggestions` | Suggestions |
| `/leaderboard` | Leaderboard |
| `/exercises` | Exercises |
| `/download-android` | Android APK page (web only) |

**Auth / account**

| Path | Screen |
|------|--------|
| `/login` | Login |
| `/profile` | Profile |
| `/account-activation` | Activation |
| `/reset-password` | Reset password |
| `/attendance-request` | Attendance request |
| `/attendance-review` | Attendance review |

**Competitions / quiz**

| Path | Screen |
|------|--------|
| `/competitions`, `/competitions/:id` | List / details |
| `/competitions/:id/timeslots` | Timeslot selection |
| `/competitions/:id/create-team` | Create team |
| `/competitions/:id/team/:teamId` | Team workspace |
| `/competitions/:id/team/:teamId/marks` | Task-quiz marks |
| `/competitions/:id/judging` | Judge submissions |
| `/quizpage`, `/quizpage/:quizId`, `/quizpage/:quizId/take/:step` | Quiz |
| `/accept-team-invitation` | Invitation accept |

**Admin**

| Path | Screen |
|------|--------|
| `/admin/*` | AdminPanel tabs |
| `/admin/competition-management[/:competitionId]` | Competition management |

## Admin access (UI)

1. Must be logged in.
2. Full admin if `GET /api/admin/dashboard` succeeds (`adminAuth`).
3. Else if `role === 'board'` or `department_id === 5` → **registrations only**.
4. Otherwise redirected away.

Tabs: dashboard, events (+ attendance query), competitions, registrations, notifications, announcements, suggestions, sponsors, board, media, content, members, seasons, emails, android.

## Season context

[`SeasonContext`](../client/src/context/SeasonContext.jsx) supplies the active season to list UIs. Pair with [Seasons](./seasons.md).

## Build output

- Vite `publicDir`: `client/static`
- Build `outDir`: `client/public` (also Capacitor `webDir`)
- Chunks: react, router, animation, home, about, etc. (see `vite.config.js`)
