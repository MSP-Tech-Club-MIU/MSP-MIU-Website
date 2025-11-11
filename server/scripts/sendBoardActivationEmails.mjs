import dotenv from 'dotenv';
import { createRequire } from 'module';
import { sendEmail, verifyEmailConfig } from '../utils/email.mjs';

const require = createRequire(import.meta.url);
const sequelize = require('../config/db');
// Import models index to ensure associations are set up
require('../models/index');
const Board = require('../models/Board');
const User = require('../models/User');
const Department = require('../models/Department');

dotenv.config();

// Get website URL from environment variable, default to localhost for development
const WEBSITE_URL = process.env.WEBSITE_URL || process.env.FRONTEND_URL || 'http://localhost:5173';

/**
 * Generate plain text email content for board member account activation
 */
function generatePlainTextEmail(boardMemberName, position, activationLink) {
  return `Hi ${boardMemberName},

Welcome to MSP MIU Board! 🎉

As a ${position} of MSP MIU, we're excited to have you on board!

To complete your account setup and activate your account on the MSP-MIU website, please click on the activation link below:

${activationLink}

This link will take you to the account activation page where you can set your password.

Once you've activated your account, you'll be able to:
- Log in to the MSP-MIU website
- Access your board member dashboard
- Manage MSP activities and events
- Access administrative features
- Stay updated with the latest announcements

If you have any questions or need assistance, please don't hesitate to contact us.

Welcome to the MSP MIU Board!

Best regards,
MSP MIU Team`;
}

/**
 * Generate HTML email content for board member account activation
 */
function generateHtmlEmail(boardMemberName, position, activationLink) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <title>Activate Your Board Account - MSP MIU</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 30px 40px; background: linear-gradient(135deg, #031C35 0%, #0D3159 50%, #1D4F82 100%); border-top-left-radius: 8px; border-top-right-radius: 8px;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">MSP MIU Board</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                Hi ${boardMemberName},
              </p>
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                <strong>Welcome to MSP MIU Board! 🎉</strong>
              </p>
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                As a <strong>${position}</strong> of MSP MIU, we're excited to have you on board!
              </p>
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                To complete your account setup and activate your account on the MSP-MIU website, please click on the activation button below:
              </p>
              
              <!-- Activation Button Section -->
              <div style="margin: 30px 0; text-align: center;">
                <a href="${activationLink}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #0d7bd8 0%, #03A9F4 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 8px rgba(13, 123, 216, 0.3);">
                  Activate Your Board Account
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
                  Board Member Benefits
                </h2>
                <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                  Once you've activated your account, you'll be able to:
                </p>
                <ul style="margin: 0 0 0 20px; padding: 0; color: #666666; font-size: 14px; line-height: 1.8;">
                  <li>Log in to the MSP-MIU website</li>
                  <li>Access your board member dashboard</li>
                  <li>Manage MSP activities and events</li>
                  <li>Access administrative features</li>
                  <li>Stay updated with the latest announcements</li>
                  <li>Coordinate with other board members</li>
                </ul>
              </div>
              
              <p style="margin: 30px 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                If you have any questions or need assistance, please don't hesitate to contact us.
              </p>
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                <strong>Welcome to the MSP MIU Board!</strong>
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
 * Send activation emails to all board members
 */
async function sendBoardActivationEmails() {
  try {
    console.log('🚀 Starting board member activation email sending process...\n');
    console.log(`🌐 Website URL: ${WEBSITE_URL}\n`);
    
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
    
    // Fetch all board members with their departments
    console.log('📊 Fetching board members from database...');
    const boardMembers = await Board.findAll({
      include: [{
        model: Department,
        as: 'department',
        attributes: ['name'],
        required: false
      }],
      attributes: ['board_id', 'full_name', 'position', 'department_id', 'year', 'email', 'user_id']
    });
    
    console.log(`✅ Found ${boardMembers.length} board member(s) in the database.\n`);
    
    if (boardMembers.length === 0) {
      console.log('ℹ️  No board members found. Exiting...');
      await sequelize.close();
      return;
    }
    
    // Statistics
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    const skipped = [];
    
    // Send email to each board member
    console.log('📨 Sending activation emails to board members...\n');
    
    for (const boardMember of boardMembers) {
      try {
        const boardMemberName = boardMember.full_name;
        const position = boardMember.position;
        const email = boardMember.email;
        
        // Check if board member has an email
        if (!email) {
          console.warn(`⚠️  Board member ${boardMemberName} (${position}, ID: ${boardMember.board_id}) has no email in board table. Skipping...`);
          skipped.push({ 
            name: boardMemberName, 
            position,
            email: 'N/A', 
            reason: 'No email in board table' 
          });
          continue;
        }
        
        // Check if user already exists and has a password (already activated)
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser && existingUser.password_hash) {
          console.warn(`⚠️  Board member ${boardMemberName} (${email}) already has an activated account. Skipping...`);
          skipped.push({ 
            name: boardMemberName, 
            position,
            email, 
            reason: 'Account already activated' 
          });
          continue;
        }
        
        // Generate activation link
        const activationLink = `${WEBSITE_URL}/account-activation?email=${encodeURIComponent(email)}`;
        
        // Generate email content
        const plainText = generatePlainTextEmail(boardMemberName, position, activationLink);
        const htmlContent = generateHtmlEmail(boardMemberName, position, activationLink);
        
        // Prepare email options
        const mailOptions = {
          to: email,
          fromName: 'MSP MIU Website',
          subject: `Activate Your Board Account - MSP MIU (${position})`,
          text: plainText,
          html: htmlContent,
          headers: {
            'X-Entity-Ref-ID': `board-activation-${boardMember.board_id}-${Date.now()}`,
          },
        };
        
        // Send email
        console.log(`📤 Sending activation email to ${boardMemberName} (${position}) - ${email}...`);
        await sendEmail(mailOptions);
        successCount++;
        console.log(`   ✅ Email sent successfully to ${boardMemberName}\n`);
        
        // Add a small delay to avoid overwhelming the email server
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        errorCount++;
        const errorMsg = `Failed to send email to ${boardMember.full_name} (${boardMember.position}): ${error.message}`;
        console.error(`   ❌ ${errorMsg}\n`);
        errors.push({
          name: boardMember.full_name,
          position: boardMember.position,
          email: 'N/A',
          error: error.message
        });
      }
    }
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 BOARD MEMBER ACTIVATION EMAIL SENDING SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully sent: ${successCount} email(s)`);
    console.log(`❌ Failed: ${errorCount} email(s)`);
    console.log(`⚠️  Skipped: ${skipped.length} board member(s)`);
    console.log(`📧 Total processed: ${boardMembers.length} board member(s)\n`);
    
    if (skipped.length > 0) {
      console.log('⚠️  SKIPPED BOARD MEMBERS:');
      skipped.forEach(({ name, position, email, reason }) => {
        console.log(`   - ${name} (${position}, ${email}): ${reason}`);
      });
      console.log();
    }
    
    if (errors.length > 0) {
      console.log('❌ ERRORS:');
      errors.forEach(({ name, position, email, error }) => {
        console.log(`   - ${name} (${position}, ${email}): ${error}`);
      });
      console.log();
    }
    
    if (successCount > 0) {
      console.log('🎉 Board member activation emails sent successfully!');
    }
    
    // Close database connection
    await sequelize.close();
    console.log('✅ Database connection closed.');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
sendBoardActivationEmails();

