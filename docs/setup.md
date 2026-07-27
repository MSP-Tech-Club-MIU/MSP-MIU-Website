# Setup

## Prerequisites

- **Node.js** ≥ 18 and **npm** ≥ 8
- **MySQL** 8.x (local or remote)
- Optional: Cloudflare R2 credentials for cloud media
- Optional: SMTP credentials for activation/reset/competition emails
- For mobile: Android Studio and/or Xcode + CocoaPods

## 1. Clone and install

```bash
git clone https://github.com/MSP-Tech-Club-MIU/MSP-MIU-Website.git
cd MSP-MIU-Website   # or MSP-MIU-Website-Back-End
npm run install:all
```

`install:all` installs root, `client/`, and `server/` dependencies.

## 2. Environment

```bash
cp .env.example .env
```

Fill at least:

- `PORT`, `DB_*`, `JWT_SECRET` (≥ 16 characters)
- Email: `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM_ADDRESS`
- `FRONTEND_URL` / `WEBSITE_URL` for links in emails

Full reference: [Environment](./environment.md).

Optional client env (Vite): create `client/.env` with `VITE_DEVELOPMENT_API_URL`, `VITE_PRODUCTION_API_URL`, `VITE_R2_PUBLIC_DOMAIN` as needed.

## 3. Database

1. Create an empty MySQL database matching `DB_NAME`.
2. Start the server once — `syncModels()` creates tables via Sequelize.
3. Prefer **schema patch scripts** for incremental changes instead of `DB_SYNC_ALTER=true` (MySQL index limits). See [Scripts & ops](./scripts-and-ops.md).

```bash
npm run patch:season-schema   # if seasons/CMS columns are missing
```

Seed a default season (via Admin → Seasons or API) before relying on season-scoped admin access.

## 4. Run locally

**Full stack (API + Vite):**

```bash
npm run dev
```

- API: `http://localhost:${PORT}` (default `3000`)
- Vite client: typically `http://localhost:5173` (proxies or calls `VITE_DEVELOPMENT_API_URL`)

**API only:**

```bash
npm run dev:server
```

**Client only:**

```bash
npm run dev:client
```

## 5. Production-style local check

```bash
npm run build
npm start
```

Express serves the API and the built SPA from `client/public`.

## 6. Verify

| Check | URL / action |
|-------|----------------|
| API health | Call a public endpoint, e.g. `GET /api/seasons/current` |
| Swagger | `http://localhost:3000/api/docs` |
| SPA | Open `FRONTEND_URL` or Vite URL |
| Login | Use an activated user; JWT stored as `localStorage.authToken` |

## Useful npm scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Concurrent server + client |
| `npm run build` | Build client into `client/public` |
| `npm start` | Production Node entry (`app.js`) |
| `npm run deploy` | `build` then `start` |
| `npm run patch:season-schema` | Season schema patch |
| `npm run cleanup:users-indexes` | Fix duplicate users indexes |

## Mobile (optional)

See [Mobile (Capacitor)](./mobile-capacitor.md). Short path:

```bash
npm run build:client
cd client && npx cap sync
```

Then open `client/android` in Android Studio or `client/ios/App` in Xcode.
