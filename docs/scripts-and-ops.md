# Scripts and operations

One-off and maintenance tools live under [`server/scripts/`](../server/scripts/). Prefer these over enabling `DB_SYNC_ALTER=true`.

## npm scripts (root)

| Script | Action |
|--------|--------|
| `patch:season-schema` | `node server/scripts/patchSeasonSchema.js` |
| `cleanup:users-indexes` | `node server/scripts/cleanupUsersIndexes.js` |
| `docs:openapi` | Regenerate `docs/openapi.yaml` from routes |

Run other scripts with `node` / `node --experimental-modules` as appropriate for `.mjs` files (from repo root, with `.env` loaded by the script or exported in the shell).

## Schema patches

| Script | Purpose |
|--------|---------|
| `patchSeasonSchema.js` | Seasons table, `season_id` FKs, backfill |
| `patchCmsSchema.js` | CMS / related column and table patches |
| `patchEmailSchema.js` | Email templates + department WhatsApp columns |
| `patchSuggestionSchema.js` | Guest suggestions (nullable member, name/email) |
| `patchBoardFaculty.js` | Align `board.faculty` ENUM |
| `patchFooterSiteContent.js` | Footer SiteContent patch |
| `cleanupUsersIndexes.js` | Dry-run/apply drop of duplicate `users` indexes |

## Email CLIs

| Script | Purpose |
|--------|---------|
| `sendActivationEmails.mjs` | Bulk member activation emails |
| `sendSingleActivationEmail.mjs` | Single member activation |
| `sendBoardActivationEmails.mjs` | Bulk board activation |
| `sendAcceptanceEmails.mjs` | Bulk acceptance emails |
| `sendCertificateEmails.mjs` | Course certificates from CSV |
| `sendSingleCertificateEmail.mjs` | Single certificate (test) |
| `sendLatestAnnouncementTestEmail.mjs` | Rebroadcast latest announcement |
| `teamInvitationEmail.js` | Invite email helpers (library, not a runner) |

Admin UI also sends many of these via `/api/email-templates` and member endpoints.

## Data / competition tools

| Script | Purpose |
|--------|---------|
| `MemberInsertion.js` | Insert approved applications as members |
| `testCompetitionCreateTeamFlow.mjs` | HTTP create-team flow test |
| `simulateCompetitionLifecycle.mjs` | End-to-end competition simulation |

Competition test scripts read `CREATE_TEAM_TEST_*` env vars — see [Environment](./environment.md).

## OpenAPI generation

| Command | Action |
|---------|--------|
| `npm run docs:openapi` | Regenerate `docs/openapi.yaml` from Express routes |
| `node scripts/install-git-hooks.js` | Install `.githooks/pre-commit` into `.git/hooks` |

The pre-commit hook runs the generator and `git add docs/openapi.yaml` so Swagger stays aligned with route changes on every commit.

## DB sync guidance

1. Let `sequelize.sync()` create missing tables on first boot.
2. For column changes, run the matching patch script.
3. Avoid prolonged use of `DB_SYNC_ALTER=true` on MySQL (index proliferation).
4. After accidental alter-sync, run `cleanup:users-indexes`.
