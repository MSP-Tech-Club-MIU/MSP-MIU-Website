# Seasons

Seasons scope club data so historical board, events, competitions, and applications stay separated by academic year.

## Season model

- Label format typically `YY/YY` (validated in utils).
- Flags: `is_default`, `is_active`, `start_year`, etc.
- Exactly one season should be marked default for admin auth and “current” filters.

## Query parameter convention

Implemented in [`server/utils/seasonFilter.js`](../server/utils/seasonFilter.js):

| `season_id` / `season` value | Behavior |
|------------------------------|----------|
| omitted, empty, or `current` | Filter to **default** season (fallback: latest active) |
| numeric id | Filter to that season |
| `all` | No season filter (include season metadata where applicable) |

Many list endpoints accept these params (events, board, competitions, announcements, etc.).

## API

| Method | Path | Access |
|--------|------|--------|
| `GET` | `/api/seasons` | Optional auth |
| `GET` | `/api/seasons/current` | Public |
| `POST` | `/api/seasons` | `authenticateToken` + `adminAuth` |
| `PUT` | `/api/seasons/:id` | Admin auth |
| `POST` | `/api/seasons/:id/set-default` | Admin auth |

## Frontend

[`SeasonContext`](../client/src/context/SeasonContext.jsx) holds the selected season for UI filtering. Admin **Seasons** tab creates seasons and sets the default.

## Admin auth dependency

[`adminAuth`](../server/middlewares/adminAuth.js) looks up the user’s **Board** row for the **default** season. After rolling to a new season, ensure board rows exist for that season or admins lose panel access.

## Schema

If `season_id` columns are missing on an older database:

```bash
npm run patch:season-schema
```

See [`server/scripts/patchSeasonSchema.js`](../server/scripts/patchSeasonSchema.js).
