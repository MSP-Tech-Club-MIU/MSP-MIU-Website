# Admin: Members and registrations

## Registrations

**Path:** `/admin/registrations`

Available to **full admins** and **registrations-only** users (board or department 5).

1. Review applications from `/become-member`.
2. Update status (accept/reject) and add comments.
3. Approving an application enrolls the student for the application’s season: creates or updates the season member row and, if they already have an account, moves that same account to the new department / current season (no duplicate login).
4. New accounts still need activation email + password; returning members with an active account can log in immediately after approval.

Returning students may re-apply on `/become-member` for a **new** season (same email / university ID). They cannot submit a second application for the same season.

Status updates for some flows require the **board** role on the applications status API.

If approve fails with a university-ID uniqueness error, run `npm run patch:members-multi-season` in `server/`.

## Members

**Path:** `/admin/members` (full admin)

1. List and filter members for the current season.
2. Create or edit member records; link users where applicable.
3. Export CSV for offline lists.
4. Send **activation emails** (bulk or single) so members can set passwords via the activation link.

## Related emails

Prefer **Emails** tab templates for activation/acceptance campaigns when available — see [Seasons and emails](./seasons-and-emails.md).
