# Admin: Content, media, sponsors, board, announcements, suggestions

## Site content (CMS)

**Path:** `/admin/content`

Edit JSON sections that power the public site:

| Key | Affects |
|-----|---------|
| Hero | Home hero texts and CTAs |
| About | About copy (ensure the About page is wired to CMS if you expect live updates) |
| Footer | Brand, vision, social links, developer credit |
| SEO | Site URL, Twitter, default OG image |
| Imagine Cup | Home Imagine Cup block |
| Gallery | Gallery titles |
| Lookups | Faculties / form dropdowns on Become Member |

Use **Reset** on a key only if you want factory defaults from the server.

## Media

**Path:** `/admin/media`

Browse and manage R2/cloud objects (images, slides, videos, documents, event thumbnails, assets). Replace or delete objects carefully — public pages may reference the same keys.

## Sponsors

**Path:** `/admin/sponsors`

CRUD sponsors for the current season; they appear on the public sponsors page and home sections. Use **Add from previous sponsors** to copy selected partners from another season into the season currently selected in the admin season filter.

## Board

**Path:** `/admin/board`

Maintain board roster for the season (name, position, department, photo, linked user). **Critical for admin access:** President / VP / Heads must have board rows in the **default** season linked to their user accounts.

## Announcements

**Path:** `/admin/announcements`

Club-wide announcements (season-scoped). Distinct from per-competition announcements in competition management.

## Suggestions

**Path:** `/admin/suggestions`

Review and delete suggestions submitted from the public suggestions page (guests or members).

## Notifications

**Path:** `/admin/notifications`

Read the admin activity feed (new registrations, etc., depending on what the backend records).
