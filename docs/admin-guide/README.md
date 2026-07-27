# Admin guide

How to use the MSP-MIU admin panel and related board tools. For developers, see [Auth & roles](../auth-and-roles.md) and [Frontend](../frontend.md).

## Who can access what

| Access level | Who | What they see |
|--------------|-----|----------------|
| **Full admin** | Board members in the **current (default) season** who are President, Vice President, or Head of Software Development / Technical Training | All `/admin` tabs |
| **Registrations only** | Other board members, or users in department **5** | Registrations tab only |
| **No admin UI** | Everyone else | Redirected away |

Open: [https://msp-miu.tech/admin](https://msp-miu.tech/admin) (or `/admin` on your environment). You must be logged in.

## Tabs

| Tab | Guide |
|-----|--------|
| Dashboard | [dashboard.md](./dashboard.md) |
| Events (+ Attendance) | [events-and-attendance.md](./events-and-attendance.md) |
| Competitions | [competitions.md](./competitions.md) |
| Registrations | [members-and-registrations.md](./members-and-registrations.md) |
| Members | [members-and-registrations.md](./members-and-registrations.md) |
| Content, Media, Sponsors, Board, Announcements, Suggestions | [content-media-sponsors.md](./content-media-sponsors.md) |
| Seasons, Emails | [seasons-and-emails.md](./seasons-and-emails.md) |
| Android | [android-app.md](./android-app.md) |
| Notifications | Listed on dashboard / notifications tab — activity feed |

Dedicated competition tooling: `/admin/competition-management/:competitionId` (full admin only).

## Season tip

Admin access is tied to the **default season**. When you start a new season, set it as default and ensure board rows exist for that season before expecting Presidents/Heads to keep access.
