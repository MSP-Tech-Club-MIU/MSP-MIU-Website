# CMS and site content

Editable public copy and structured JSON are stored in the `SiteContent` table and served via `/api/site-content`.

## Allowed keys

Defaults and allowlist: [`server/utils/siteContentDefaults.js`](../server/utils/siteContentDefaults.js).

| Key | Purpose | Primary consumers |
|-----|---------|-------------------|
| `hero` | Home hero texts, subtitle, CTAs | `HeroSection` via `useSiteContent` |
| `about` | About page copy (mission, vision, values) | Editable in Admin Content; About page may still use hardcoded copy |
| `footer` | Brand, vision, socials, developer credit | `Footer` |
| `seo` | Site URL, Twitter handle, default OG image | `SEO` |
| `imagine_cup` | Imagine Cup section toggle and content | `ImagineCupSection` |
| `gallery` | Gallery title/subtitle | `Dome` |
| `lookups` | Faculties and similar form lists | `BecomeMember` |
| `android_app` | APK metadata (version, key, notes) | `/api/android-app` (not `useSiteContent`) |

## API

| Method | Path | Access |
|--------|------|--------|
| `GET` | `/api/site-content` | Public (all keys with defaults merged) |
| `GET` | `/api/site-content/:key` | Public |
| `PUT` | `/api/site-content/:key` | admin/board |
| `POST` | `/api/site-content/:key/reset` | admin/board — restore defaults |

## Frontend hook

[`useSiteContent(keys)`](../client/src/hooks/useSiteContent.js) loads keys from the API and falls back to local defaults when missing or offline.

Admin editing: **Admin → Content** (`SiteContentAdminTab`).

## Related CMS surfaces

Not stored as SiteContent keys but managed in admin:

- Events, sponsors, board, media (R2), announcements, members, email templates, seasons, Android APK publish.

## Schema patches

```bash
node server/scripts/patchCmsSchema.js
node server/scripts/patchFooterSiteContent.js
```
