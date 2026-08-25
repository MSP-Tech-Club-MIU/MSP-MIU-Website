# Environment variables

Copy [`.env.example`](../.env.example) to `.env` at the repo root. Never commit `.env`.

The server loads env via `dotenv` in [`app.js`](../app.js). Vite client vars must be prefixed with `VITE_` and live in `client/.env` (or the shell) at build time.

## Server — required

| Variable | Description |
|----------|-------------|
| `PORT` | HTTP listen port (e.g. `3000`) |
| `DB_HOST` | MySQL host |
| `DB_PORT` | MySQL port (default `3306`) |
| `DB_NAME` | Database name |
| `DB_USER` | Database user |
| `DB_PASS` | Database password |
| `JWT_SECRET` | Signing secret; **minimum 16 characters** |
| `JWT_EXPIRES_IN` | Token lifetime (e.g. `24h`) |

## Server — email (Nodemailer)

Code reads **`MAIL_*`** (not `SMTP_*`):

| Variable | Description |
|----------|-------------|
| `MAIL_HOST` | SMTP host (e.g. `smtp.gmail.com`) |
| `MAIL_PORT` | `587` (TLS) or `465` (SSL) |
| `MAIL_USERNAME` | SMTP username |
| `MAIL_PASSWORD` | SMTP password / app password |
| `MAIL_FROM_ADDRESS` | From address (fallback `noreply@msp-miu.tech`) |

## Server — URLs

| Variable | Description |
|----------|-------------|
| `FRONTEND_URL` | Public site origin for email links |
| `WEBSITE_URL` | Alternate/public site URL |
| `NODE_ENV` | `development` / `production` |

## Server — Cloudflare R2 (optional but used in prod)

| Variable | Description |
|----------|-------------|
| `R2_ENDPOINT` | S3-compatible endpoint |
| `R2_ACCESS_KEY` | Access key |
| `R2_SECRET_KEY` | Secret key |
| `R2_BUCKET` | Bucket name |
| `R2_PUBLIC_DOMAIN` | Public CDN/base URL for objects |
| `R2_TLS_INSECURE` | Set if TLS verification must be relaxed (local only) |

Without R2, uploads fall back to local `server/uploads/`.

## Server — auth / judging / ops

| Variable | Description |
|----------|-------------|
| `DB_SYNC_ALTER` | If `true`, Sequelize `alter: true` on sync — **prefer patch scripts** |
| `JUDGE_BOARD_POSITIONS` | CSV of board positions allowed to judge (default `President,Vice President,Head,Co-Head`) |
| `JUDGE_BOARD_DEPARTMENT_IDS` | CSV of dept IDs; empty = any dept among allowed positions |
| `QUIZ_DEBUG` | Extra quiz logging when set |
| `CHROME_PATH` | Chrome/Chromium path for Lighthouse evaluation |
| `INSTAGRAM_URL` / `TIKTOK_URL` | Social links used in some templates |
| `COURSE_NAME` | Certificate email copy |
| `FEEDBACK_FORM_URL` | Feedback form link in emails |
| `GITHUB_COPILOT_LEARNING_PATH_URL` | Learning path link in emails |
| `LOGO_URL` | Logo URL for email HTML |

## Server — test scripts only

Used by competition test CLIs under `server/scripts/`:

`CREATE_TEAM_TEST_COMPETITION_ID`, `CREATE_TEAM_TEST_JWT`, `CREATE_TEAM_TEST_API_BASE`, `CREATE_TEAM_TEST_LEADER_NAME`, `CREATE_TEAM_TEST_LEADER_UNIVERSITY_ID`, `CREATE_TEAM_TEST_LEADER_EMAIL`

## Client (Vite)

| Variable | Description |
|----------|-------------|
| `VITE_DEVELOPMENT_API_URL` | Dev API base (default `http://localhost:3000/api`) |
| `VITE_PRODUCTION_API_URL` | Prod API base (default `/api` on web; Capacitor defaults to `https://msp-miu.tech/api`) |
| `VITE_R2_PUBLIC_DOMAIN` | Public media domain for favicons / Android download page |

## Notes

- Database SSL is enabled in [`server/config/db.js`](../server/config/db.js) with `rejectUnauthorized: false` for managed MySQL hosts.
- Align `.env.example` with this document when adding new vars.
