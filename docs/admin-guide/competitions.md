# Admin: Competitions

**Paths:** `/admin/competitions` · `/admin/competition-management/:competitionId`

Full **adminAuth** required (not registrations-only).

## Create and configure

1. Open **Competitions** and create a competition (name, season, dates, config).
2. Open **Competition management** for that competition.
3. Add **tasks** (code/project, task-quiz, etc.) and optional task assets.
4. Configure the **quiz** (questions and options) if the competition uses one.
5. Create **timeslots**, then **publish selection links** so teams can pick slots.
6. Assign or unassign timeslots manually when needed.
7. Manage **teams** (create, edit members, cancel invitations).
8. Assign **judges** (board user IDs in competition judging config).

## Day-of operations

- Post **competition announcements** (with optional email to teams).
- Monitor submissions; run **automated evaluation** where configured.
- Judges use `/competitions/:id/judging` on the public site (judging access rules apply).
- Teams view marks at `/competitions/:id/team/:teamId/marks`.

## Related public pages

- List/detail: `/competitions`, `/competitions/:id`
- Create team / workspace / timeslots / quiz pages under `/competitions/...` and `/quizpage/...`

Developer detail: [Competitions & quizzes](../competitions-and-quizzes.md).
