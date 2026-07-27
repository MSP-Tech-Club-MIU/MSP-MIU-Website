# Admin: Dashboard

**Path:** `/admin/dashboard`

## Purpose

At-a-glance counts and status for the club: competitions, registrations, attendance, suggestions, and related activity (exact widgets depend on the current season and API payload).

## Typical uses

1. Confirm you have **full admin** access (if this page loads, `adminAuth` succeeded).
2. Spot spikes in pending registrations or attendance requests.
3. Jump to the relevant tab to take action.

## Notes

- Registrations-only users cannot open the dashboard; they are limited to Registrations.
- Stats respect the active/default season on the server.
