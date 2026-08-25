# Admin: Seasons and emails

## Seasons

**Path:** `/admin/seasons`

1. Create a new season (label like `25/26`).
2. Mark it **default** when the club rolls over.
3. Ensure board, events, and competitions for the new year use that season.

Changing the default season changes:

- What “current” public lists show by default
- Which board row `adminAuth` checks for panel access

### Verify season isolation

From `server/`:

```bash
npm run check:season-separation
```

This checks DB uniqueness, null `season_id` rows, controller/UI wiring, list isolation, and returning-member enrollment (no duplicate accounts across seasons).

## Email templates

**Path:** `/admin/emails`

1. Edit templates (activation, acceptance, board activation, etc.).
2. Send a **test** email before bulk sends.
3. Run bulk sends: member activation, board activation, member acceptance.
4. Manage department **WhatsApp** links used in some templates.

CLI alternatives for large batches live under `server/scripts/` — see [Scripts & ops](../scripts-and-ops.md).

## SMTP

Emails require working `MAIL_*` environment variables on the server. If sends fail, check server logs and SMTP credentials before retrying bulk jobs.
