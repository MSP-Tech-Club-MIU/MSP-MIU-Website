# Deployment

## Web / API (typical production)

There is **no Docker** compose in this repo. Production pattern:

1. Set production `.env` on the host (DB, JWT, `MAIL_*`, R2, URLs).
2. Install dependencies and build the client.
3. Start the single Node process.

```bash
npm run install:all
npm run build          # → client/public
npm start              # node --use-system-ca app.js
```

Or: `npm run deploy` (`build` then `start`).

Express serves:

- `/api/*` — API
- `/uploads/*` — local uploads
- `/*` — SPA from `client/public`

Live site reference: `https://msp-miu.tech`.

## Database ops

- Prefer patch scripts over `DB_SYNC_ALTER=true`.
- After deploy of schema-related code, run the relevant `server/scripts/patch*.js` once.
- Keep a default season set so `adminAuth` continues to work.

## Media

- Configure R2 env vars so media and APK assets use object storage.
- Without R2, files land in `server/uploads/` (ensure disk persistence on the host).

## Email

Ensure `MAIL_*` works from the production host (firewall, Gmail app passwords, SPF/DKIM as needed).

## iOS CI (Codemagic)

[`codemagic.yaml`](../codemagic.yaml) builds an **ad hoc IPA** on push to `Back-End` or `main`:

1. `npm ci` / install
2. `build:client`
3. `npx cap sync ios`
4. Signed IPA artifact

Prerequisites: Apple bundle id `tech.mspmiu`, registered devices, App Store Connect API key in Codemagic. This pipeline does **not** deploy the Node server.

## Android

Build/sign via Android Studio after `cap sync`. Version should stay aligned with `MARKETING_VERSION` / `versionName` (see Codemagic comments and `client/android/app/build.gradle`).

## Health checks after deploy

- `GET /api/seasons/current`
- Open `/api/docs`
- Login + admin dashboard smoke test
- Spot-check CMS pages (home hero, events)
