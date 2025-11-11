# Activation Email Script

This script sends activation emails to all members in the database, allowing them to activate their accounts on the MSP-MIU website.

## Overview

The script:
1. Fetches all members from the `members` table
2. Generates an activation link for each member
3. Sends an email with the activation link
4. Members can click the link to set their password and activate their account

## Prerequisites

1. **Environment Variables**: Make sure your `.env` file has the following variables:
   - `SMTP_HOST` - SMTP server host
   - `SMTP_PORT` - SMTP server port
   - `SMTP_USER` - SMTP username/email
   - `SMTP_PASS` - SMTP password
   - `SMTP_SECURE` - Set to `true` for SSL (port 465) or `false` for TLS (port 587)
   - `WEBSITE_URL` (optional) - The website URL where the activation page is hosted (defaults to `http://localhost:5173`)

2. **Database**: Ensure the database is running and accessible

3. **Members Table**: The `members` table should contain member records with valid email addresses

## Usage

### Run the script:

```bash
npm run send-activation-emails
```

Or directly:

```bash
node server/scripts/sendActivationEmails.mjs
```

## What the Script Does

1. **Fetches Members**: Retrieves all members from the database
2. **Checks Activation Status**: Skips members who already have activated accounts (users with passwords)
3. **Generates Activation Links**: Creates unique activation links for each member:
   ```
   {WEBSITE_URL}/account-activation?email={member_email}
   ```
4. **Sends Emails**: Sends a beautifully formatted HTML email to each member with:
   - Welcome message
   - Activation button/link
   - Instructions on what to do next
   - Information about account benefits

## Email Content

The email includes:
- Personalized greeting with member's name
- Clear call-to-action button to activate account
- Alternative text link if the button doesn't work
- Information about account benefits after activation
- Professional MSP MIU branding

## Activation Flow

1. Member receives email with activation link
2. Member clicks the link → Redirected to `/account-activation?email={email}`
3. Member sees their email (read-only) and enters a password
4. Member submits the form
5. Backend creates/updates user record with:
   - Email from member record
   - University ID from member record
   - Full name from member record
   - Department ID from member record
   - Hashed password
   - Role set to 'member'
   - Account activated (is_active = true)
6. Member record is linked to user record
7. Member sees success message and can log in

## Skipped Members

The script will skip members who:
- Don't have an email address
- Already have an activated account (user exists with password)

## Output

The script provides a detailed summary including:
- Number of emails successfully sent
- Number of failed emails
- Number of skipped members
- List of skipped members with reasons
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

### Members skipped:
- Check if members have valid email addresses
- Verify if users already exist for those members
- Check database connection

## Notes

- The script includes a 1-second delay between emails to avoid overwhelming the email server
- Activation links are URL-encoded to handle special characters in email addresses
- The script logs all activities for debugging and auditing purposes
- Members with already activated accounts are automatically skipped

