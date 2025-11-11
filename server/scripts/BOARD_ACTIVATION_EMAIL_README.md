# Board Member Activation Email Script

This script sends activation emails to all board members in the database, allowing them to activate their accounts on the MSP-MIU website.

## Overview

The script:
1. Fetches all board members from the `board` table
2. Finds email addresses for each board member (from User records or Applications)
3. Generates an activation link for each board member
4. Sends an email with the activation link
5. Board members can click the link to set their password and activate their account

## Prerequisites

1. **Environment Variables**: Make sure your `.env` file has the following variables:
   - `SMTP_HOST` - SMTP server host
   - `SMTP_PORT` - SMTP server port
   - `SMTP_USER` - SMTP username/email
   - `SMTP_PASS` - SMTP password
   - `SMTP_SECURE` - Set to `true` for SSL (port 465) or `false` for TLS (port 587)
   - `WEBSITE_URL` (optional) - The website URL where the activation page is hosted (defaults to `http://localhost:5173`)

2. **Database**: Ensure the database is running and accessible

3. **Board Table**: The `board` table should contain board member records

4. **Email Field**: Board members must have an `email` field populated in the `board` table

## Usage

### Run the script:

```bash
npm run send-board-activation-emails
```

Or directly:

```bash
node server/scripts/sendBoardActivationEmails.mjs
```

## What the Script Does

1. **Fetches Board Members**: Retrieves all board members from the database with their departments and email addresses
2. **Checks Email**: Verifies each board member has an email address in the board table
3. **Checks Activation Status**: Skips board members who already have activated accounts (users with passwords)
4. **Generates Activation Links**: Creates unique activation links for each board member:
   ```
   {WEBSITE_URL}/account-activation?email={board_member_email}
   ```
5. **Sends Emails**: Sends a beautifully formatted HTML email to each board member with:
   - Welcome message with their position
   - Activation button/link
   - Instructions on what to do next
   - Information about board member benefits

## Email Content

The email includes:
- Personalized greeting with board member's name and position
- Clear call-to-action button to activate account
- Alternative text link if the button doesn't work
- Information about board member benefits after activation
- Professional MSP MIU branding

## Activation Flow

1. Board member receives email with activation link
2. Board member clicks the link → Redirected to `/account-activation?email={email}`
3. Board member sees their email (read-only) and enters a password
4. Board member submits the form
5. Backend creates/updates user record with:
   - Email from board table
   - Full name from board record
   - Department ID from board record
   - Hashed password
   - Role set to 'board' (always 'board' for board members)
   - Account activated (is_active = true)
   - University ID from application if available, otherwise null
6. Board member record is linked to user record
7. Board member sees success message and can log in

## Email Source

The script gets email addresses directly from the `email` field in the `board` table. Each board member record should have an email address stored in the board table.

## Skipped Board Members

The script will skip board members who:
- Don't have an email address in the board table
- Already have an activated account (user exists with password)

## Output

The script provides a detailed summary including:
- Number of emails successfully sent
- Number of failed emails
- Number of skipped board members
- List of skipped board members with reasons
- List of errors (if any)

## Environment Variables

### Required:
- `SMTP_HOST` - SMTP server hostname
- `SMTP_PORT` - SMTP server port (e.g., 587 for TLS, 465 for SSL)
- `SMTP_USER` - SMTP authentication username
- `SMTP_PASS` - SMTP authentication password
- `SMTP_SECURE` - `true` for SSL, `false` for TLS

### Optional:
- `WEBSITE_URL` - Website URL for activation links (default: `http://localhost:5173`)
- `FRONTEND_URL` - Alternative environment variable name (used if `WEBSITE_URL` is not set)

## Example .env Configuration

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
WEBSITE_URL=https://msp-miu.tech
```

## Troubleshooting

### Email not sending:
- Check SMTP credentials in `.env` file
- Verify SMTP server allows connections from your IP
- Check firewall settings
- Verify email configuration with: `npm run check-email-config`

### Activation link not working:
- Verify `WEBSITE_URL` is set correctly in `.env`
- Ensure the frontend is running and accessible
- Check that the route `/account-activation` exists in the frontend

### Board members skipped (no email found):
- Ensure all board members have email addresses in the `email` field of the board table
- Check database to verify email field is populated for all board members

### Board members not found during activation:
- Verify that the email in the board table matches the email used in the activation link
- Check database for any data inconsistencies
- Ensure email addresses are valid and properly stored

## Notes

- The script includes a 1-second delay between emails to avoid overwhelming the email server
- Activation links are URL-encoded to handle special characters in email addresses
- The script logs all activities for debugging and auditing purposes
- Board members with already activated accounts are automatically skipped
- Board members are created with role 'board' in the users table (always 'board')
- Board members might not have university_id (tries to get from Application table if available, otherwise null)
- All board users are guaranteed to have role 'board' in the users table

## Differences from Member Activation

- Board members have email field directly in Board table
- Board members get role 'board' instead of 'member' (ensured in activation endpoint)
- Board members might not have university_id (tries to get from Application if available)
- All board users are created in users table with role 'board'
- Board member records are linked to user records after activation

