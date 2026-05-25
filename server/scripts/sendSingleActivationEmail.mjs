import dotenv from 'dotenv';
import { createRequire } from 'module';
import { sendEmail, verifyEmailConfig } from '../utils/email.mjs';

const require = createRequire(import.meta.url);
const sequelize = require('../config/db');
// Import models index to ensure associations are set up
require('../models/index');
const Member = require('../models/Member');
const User = require('../models/User');
const { generateToken } = require('../utils/jwt');

dotenv.config();

// Get website URL from environment variable
const WEBSITE_URL = process.env.FRONTEND_URL || 'https://msp-miu.tech';

/**
 * Generate plain text email content for account activation
 */
function generatePlainTextEmail(studentName, activationLink) {
  return `Hi ${studentName},

Welcome to MSP MIU! 🎉

To complete your account setup and activate your account on the MSP-MIU website, please click on the activation link below:

${activationLink}

This link will take you to the account activation page where you can set your password.

Once you've activated your account, you'll be able to:
- Log in to the MSP-MIU website
- Access your profile
- Participate in MSP activities and events
- Stay updated with the latest announcements

If you have any questions or need assistance, please don't hesitate to contact us.

Welcome to the MSP MIU family!

Best regards,
MSP MIU Team`;
}

/**
 * Generate HTML email content for account activation
 */
function generateHtmlEmail(studentName, activationLink) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <title>Activate Your Account - MSP MIU</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 30px 40px; background: linear-gradient(135deg, #031C35 0%, #0D3159 50%, #1D4F82 100%); border-top-left-radius: 8px; border-top-right-radius: 8px;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">MSP MIU</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                Hi ${studentName},
              </p>
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                <strong>Welcome to MSP MIU! 🎉</strong>
              </p>
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                To complete your account setup and activate your account on the MSP-MIU website, please click on the activation button below:
              </p>
              
              <!-- Activation Button Section -->
              <div style="margin: 30px 0; text-align: center;">
                <a href="${activationLink}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #0d7bd8 0%, #03A9F4 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 8px rgba(13, 123, 216, 0.3);">
                  Activate Your Account
                </a>
              </div>
              
              <!-- Alternative Link -->
              <div style="margin: 20px 0; padding: 15px; background-color: #f9f9f9; border-radius: 6px;">
                <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                  If the button doesn't work, copy and paste this link into your browser:
                </p>
                <p style="margin: 0; word-break: break-all;">
                  <a href="${activationLink}" style="color: #0d7bd8; text-decoration: none; font-size: 12px;">${activationLink}</a>
                </p>
              </div>
              
              <!-- Information Section -->
              <div style="margin: 30px 0; padding: 20px; background-color: #eaf2ff; border-radius: 6px; border-left: 4px solid #03A9F4;">
                <h2 style="margin: 0 0 15px 0; color: #333333; font-size: 18px; font-weight: 600;">
                  What's Next?
                </h2>
                <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                  Once you've activated your account, you'll be able to:
                </p>
                <ul style="margin: 0 0 0 20px; padding: 0; color: #666666; font-size: 14px; line-height: 1.8;">
                  <li>Log in to the MSP-MIU website</li>
                  <li>Access your profile and dashboard</li>
                  <li>Participate in MSP activities and events</li>
                  <li>Stay updated with the latest announcements</li>
                  <li>Connect with other MSP members</li>
                </ul>
              </div>
              
              <p style="margin: 30px 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                If you have any questions or need assistance, please don't hesitate to contact us.
              </p>
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                <strong>Welcome to the MSP MIU family!</strong>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #f9f9f9; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px; border-top: 1px solid #eeeeee;">
              <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.5;">
                Best regards,<br>
                <strong>MSP MIU Team</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Send activation email to a single member
 * @param {string|number} identifier - Email address or member_id
 * @returns {Object} - Result object with success status and details
 */
async function sendActivationEmailForMember(identifier) {
  try {
    // Determine if identifier is email or member_id
    const isEmail = typeof identifier === 'string' && identifier.includes('@');
    const isMemberId = !isNaN(Number(identifier)) && !isEmail;
    
    if (!isEmail && !isMemberId) {
      return {
        success: false,
        identifier,
        error: 'Invalid identifier. Must be either an email address or a numeric member_id.'
      };
    }
    
    // Find member by email or member_id
    let member;
    
    if (isEmail) {
      member = await Member.findOne({
        where: { email: identifier },
        attributes: ['member_id', 'full_name', 'email', 'university_id']
      });
    } else {
      member = await Member.findByPk(Number(identifier), {
        attributes: ['member_id', 'full_name', 'email', 'university_id']
      });
    }
    
    if (!member) {
      return {
        success: false,
        identifier,
        error: `Member not found with ${isEmail ? 'email' : 'member_id'}: ${identifier}`
      };
    }
    
    // Check if member has an email
    if (!member.email) {
      return {
        success: false,
        identifier,
        memberName: member.full_name,
        memberId: member.member_id,
        error: 'Member has no email in members table. Cannot send activation email.'
      };
    }
    
    // Check if user already exists and is active or has a password (already activated)
    const existingUser = await User.findOne({ where: { email: member.email } });
    if (existingUser && (existingUser.is_active || existingUser.password_hash)) {
      const reason = existingUser.is_active ? 'Account is already active (is_active: 1)' : 'Account already has a password';
      return {
        success: false,
        skipped: true,
        identifier,
        memberName: member.full_name,
        email: member.email,
        reason
      };
    }
    
    // Generate activation token
    const tokenResult = generateToken({
        email: member.email,
        type: 'activation',
        member_id: member.member_id
    });
    
    if (!tokenResult.success) {
      return {
        success: false,
        identifier,
        memberName: member.full_name,
        email: member.email,
        error: `Token generation failed: ${tokenResult.error}`
      };
    }
    
    // Generate activation link with token
    const activationLink = `${WEBSITE_URL}/account-activation?token=${encodeURIComponent(tokenResult.token)}`;
    
    // Generate email content
    const plainText = generatePlainTextEmail(member.full_name, activationLink);
    const htmlContent = generateHtmlEmail(member.full_name, activationLink);
    
    // Prepare email options
    const mailOptions = {
      to: member.email,
      fromName: 'MSP MIU Website',
      subject: 'Activate Your Account - MSP MIU',
      text: plainText,
      html: htmlContent,
      headers: {
        'X-Entity-Ref-ID': `activation-${member.member_id}-${Date.now()}`,
      },
    };
    
    // Send email
    await sendEmail(mailOptions);
    
    // Check if user exists and verify is_active status
    const userAfterEmail = await User.findOne({ where: { email: member.email } });
    const accountStatus = userAfterEmail 
      ? (userAfterEmail.is_active ? 'active' : 'inactive')
      : 'does not exist yet';
    
    return {
      success: true,
      identifier,
      memberName: member.full_name,
      email: member.email,
      memberId: member.member_id,
      activationLink,
      accountStatus
    };
    
  } catch (error) {
    return {
      success: false,
      identifier,
      error: error.message
    };
  }
}

/**
 * Send activation emails to multiple members
 * @param {Array<string|number>} identifiers - Array of email addresses or member_ids
 */
async function sendActivationEmails(identifiers) {
  try {
    console.log('🚀 Starting activation email sending process...\n');
    console.log(`🌐 Website URL: ${WEBSITE_URL}\n`);
    console.log(`📋 Processing ${identifiers.length} user(s)...\n`);
    
    // Verify email configuration
    console.log('📧 Verifying email configuration...');
    const isVerified = await verifyEmailConfig();
    
    if (!isVerified) {
      console.error('❌ Email configuration verification failed. Please check your .env file.');
      process.exit(1);
    }
    
    // Test database connection
    console.log('🔌 Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.\n');
    
    // Statistics
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    const errors = [];
    const skipped = [];
    const successful = [];
    
    // Process each identifier
    console.log('📨 Sending activation emails...\n');
    
    for (let i = 0; i < identifiers.length; i++) {
      const identifier = identifiers[i];
      console.log(`[${i + 1}/${identifiers.length}] Processing: ${identifier}`);
      
      const result = await sendActivationEmailForMember(identifier);
      
      if (result.success) {
        successCount++;
        successful.push(result);
        console.log(`   ✅ Email sent successfully to ${result.memberName} (${result.email})`);
        console.log(`   ℹ️  Account status: ${result.accountStatus}`);
        console.log(`   🔗 Activation Link: ${result.activationLink}`);
      } else if (result.skipped) {
        skippedCount++;
        skipped.push(result);
        console.log(`   ⚠️  Skipped: ${result.memberName || identifier} - ${result.reason}`);
      } else {
        errorCount++;
        errors.push(result);
        console.log(`   ❌ Failed: ${result.error}`);
      }
      console.log();
      
      // Add a small delay to avoid overwhelming the email server
      if (i < identifiers.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 ACTIVATION EMAIL SENDING SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully sent: ${successCount} email(s)`);
    console.log(`❌ Failed: ${errorCount} email(s)`);
    console.log(`⚠️  Skipped: ${skippedCount} user(s)`);
    console.log(`📧 Total processed: ${identifiers.length} user(s)\n`);
    
    if (skipped.length > 0) {
      console.log('⚠️  SKIPPED USERS:');
      skipped.forEach(({ identifier, memberName, email, reason }) => {
        console.log(`   - ${memberName || identifier} (${email || identifier}): ${reason}`);
      });
      console.log();
    }
    
    if (errors.length > 0) {
      console.log('❌ ERRORS:');
      errors.forEach(({ identifier, memberName, email, error }) => {
        console.log(`   - ${memberName || identifier} (${email || identifier}): ${error}`);
      });
      console.log();
    }
    
    if (successful.length > 0) {
      console.log('✅ SUCCESSFUL:');
      successful.forEach(({ memberName, email, activationLink }) => {
        console.log(`   - ${memberName} (${email})`);
        console.log(`     Link: ${activationLink}`);
      });
      console.log();
    }
    
    if (successCount > 0) {
      console.log('🎉 Activation emails sent successfully!');
    }
    
    console.log(`\n⏰ Token expires in: 7 days (default JWT expiration)`);
    
    // Close database connection
    await sequelize.close();
    console.log('\n✅ Database connection closed.');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    try {
      await sequelize.close();
    } catch (closeError) {
      // Ignore close errors
    }
    process.exit(1);
  }
}

// Get identifiers from command line arguments (all arguments after script name)
const identifiers = process.argv.slice(2);

if (identifiers.length === 0) {
  console.error('❌ Error: No identifiers provided.');
  console.log('\nUsage:');
  console.log('  node sendSingleActivationEmail.mjs <identifier1> [identifier2] [identifier3] ...');
  console.log('\nIdentifiers can be:');
  console.log('  - Email addresses (e.g., user@example.com)');
  console.log('  - Member IDs (e.g., 123)');
  console.log('\nExamples:');
  console.log('  node sendSingleActivationEmail.mjs user@example.com');
  console.log('  node sendSingleActivationEmail.mjs 123');
  console.log('  node sendSingleActivationEmail.mjs user1@example.com user2@example.com 456');
  console.log('  node sendSingleActivationEmail.mjs 123 456 789');
  process.exit(1);
}

// Run the script
sendActivationEmails(identifiers);

