# Mobile (Capacitor)

Native shells wrap the same Vite build as the website.

## Config

| Item | Value |
|------|--------|
| Config file | [`client/capacitor.config.json`](../client/capacitor.config.json) |
| `appId` | `tech.mspmiu` |
| `appName` | MSP - MIU |
| `webDir` | `public` (Vite build output) |
| Projects | `client/android/`, `client/ios/` |
| Capacitor | v7.x (`@capacitor/app` for back button) |

## Sync workflow

```bash
npm run build:client
cd client
npx cap sync
```

Then open:

- Android: Android Studio → `client/android`
- iOS: Xcode → `client/ios/App` (CocoaPods / workspace)

## API target

Native builds always call the **production** API (`VITE_PRODUCTION_API_URL` or `https://msp-miu.tech/api`). Localhost is not used inside the device/emulator unless you deliberately point env at a tunnel.

## Android back button

Helpers:

- `AndroidBackButtonSetup` / `AndroidBackButtonHandler`
- Hook `useAndroidBackButton`
- Utils `utils/androidBackButton.js`

Hardware back navigates React Router history instead of exiting immediately where configured.

## Download page

Web route `/download-android` serves APK metadata from `/api/android-app` and R2 public domain. Capacitor often redirects this route home (native already is the app).

## Admin: publish APK

Full admins can upload/notify via **Admin → Android** (`POST /api/android-app/publish`, `/notify`). See [Admin guide: Android](./admin-guide/android-app.md).

## CI

iOS IPA: [Codemagic](./deployment.md#ios-ci-codemagic). Keep `MARKETING_VERSION` / Android `versionName` / `versionCode` in sync when releasing.
