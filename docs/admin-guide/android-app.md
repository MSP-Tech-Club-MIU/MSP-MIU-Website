# Admin: Android app

**Path:** `/admin/android`

Full **adminAuth** required.

## Publish a new APK

1. Build a signed release APK (versionName / versionCode bumped).
2. Open **Android** in the admin panel.
3. Upload via **Publish** (`POST /api/android-app/publish`).
4. Confirm metadata (version, release notes, public download key) on `GET /api/android-app`.
5. Optionally **Notify** users of the update (`POST /api/android-app/notify`).

## Public download

Web users open `/download-android`. The page uses API metadata and the R2 public domain. Capacitor apps typically do not show this page (they already are the app).

## Version alignment

Keep Android `versionName` / `versionCode`, iOS `MARKETING_VERSION`, and published metadata in sync when releasing. See [Mobile](../mobile-capacitor.md) and [Deployment](../deployment.md).
