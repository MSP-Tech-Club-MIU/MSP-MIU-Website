import dotenv from 'dotenv';
import { createRequire } from 'module';
import { sendEmail, verifyEmailConfig } from '../utils/email.mjs';

const require = createRequire(import.meta.url);
const sequelize = require('../config/db');
// Import models index to ensure associations are set up
require('../models/index');
const Member = require('../models/Member');
const Department = require('../models/Department');

dotenv.config();

// Map department names to WhatsApp group links
const departmentWhatsAppLinks = {
  'Media & Content Creation': 'https://chat.whatsapp.com/I64zmHEVRiFIuZqMKBKLma?mode=ems_copy_t',
  'Human Resources': 'https://chat.whatsapp.com/EPwUJcrQv1U03hGiN9jkkV?mode=ems_copy_t',
  'Software Development': 'https://chat.whatsapp.com/GkKuGje7wv5AfjOE1SpeZA?mode=ems_copy_t',
  'Public Relations': 'https://chat.whatsapp.com/IZgp2iqQ00K1qCaiyO9WgP?mode=ems_copy_t',
  'Event Planning': 'https://chat.whatsapp.com/CJCWsKh5ANXAYZiYIMkfem?mode=ems_copy_t',
  'Technical Training': 'https://chat.whatsapp.com/Ku12m4quUqPCvYpERQKTM0?mode=ems_copy_t'
};

// Social media links
const instagramLink = 'https://www.instagram.com/mspmiu';
const tiktokLink = 'https://www.tiktok.com/@mspmiu';

// Opening Session details
const openingSessionDate = 'Wednesday, November 12, 2025';
const openingSessionTime = '12:00 PM to 2:00 PM';
const openingSessionLocation = 'OOA Room, Main Building';
const orangeBusinessTalkTime = '2:00 PM to 3:00 PM';

// Orange Business speakers
const orangeBusinessSpeakers = [
  'Ahmed Galal Eldin, Operational Department Head',
  'Sandy Elias George, Incident Management Specialist',
  'Fady Sherif Saad, Incident Management Team Leader'
];

/**
 * Generate plain text email content
 */
function generatePlainTextEmail(studentName, departmentName, departmentLink) {
  return `Hi ${studentName},

Congratulations! 🎊 You've been accepted into the ${departmentName} Department at MSP MIU!

We really enjoyed your interview and are excited to see what you'll bring to the team.

Join the Department WhatsApp Group

Stay connected with your teammates, get instant updates, and never miss an announcement by joining our official WhatsApp group:

${departmentLink}

To kick things off, we'd love to see you at our Opening Session on ${openingSessionDate}, from ${openingSessionTime} at the ${openingSessionLocation}, followed by a special Orange Business Talk from ${orangeBusinessTalkTime}.

Speakers from Orange Business:

${orangeBusinessSpeakers.map(speaker => `- ${speaker}`).join('\n')}

If you haven't already, make sure to join our MSP group and follow us to stay updated on events and announcements:

Instagram: ${instagramLink}

TikTok: ${tiktokLink}

We're so glad to have you with us - welcome to the MSP MIU family!

Can't wait to see you at the Opening Session!

Cheers,
MSP MIU Team`;
}

/**
 * Generate HTML email content
 */
function generateHtmlEmail(studentName, departmentName, departmentLink) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <title>Welcome to MSP MIU - ${departmentName} Department</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 30px 40px; background-color: #ffffff; border-top-left-radius: 8px; border-top-right-radius: 8px;">
              <h1 style="margin: 0; color: #333333; font-size: 24px; font-weight: 600;">MSP MIU</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 30px 40px; background-color: #ffffff;">
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                Hi ${studentName},
              </p>
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                <strong>Congratulations! 🎊</strong> You've been accepted into the <strong>${departmentName} Department</strong> at MSP MIU!
              </p>
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                We really enjoyed your interview and are excited to see what you'll bring to the team.
              </p>
              
              <!-- WhatsApp Group Section -->
              <div style="margin: 30px 0; padding: 20px; background-color: #f9f9f9; border-radius: 6px; border-left: 4px solid #25D366;">
                <h2 style="margin: 0 0 15px 0; color: #333333; font-size: 18px; font-weight: 600;">
                  Join the Department WhatsApp Group
                </h2>
                <p style="margin: 0 0 15px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                  Stay connected with your teammates, get instant updates, and never miss an announcement by joining our official WhatsApp group:
                </p>
                <p style="margin: 0;">
                  <a href="${departmentLink}" style="display: inline-block; padding: 12px 24px; background-color: #25D366; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
                    Join ${departmentName} WhatsApp Group
                  </a>
                </p>
              </div>
              
              <!-- Opening Session Section -->
              <div style="margin: 30px 0; padding: 20px; background-color: #fff9e6; border-radius: 6px; border-left: 4px solid #FFA500;">
                <h2 style="margin: 0 0 15px 0; color: #333333; font-size: 18px; font-weight: 600;">
                  Opening Session
                </h2>
                <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                  To kick things off, we'd love to see you at our Opening Session on <strong>${openingSessionDate}</strong>, from <strong>${openingSessionTime}</strong> at the <strong>${openingSessionLocation}</strong>, followed by a special Orange Business Talk from <strong>${orangeBusinessTalkTime}</strong>.
                </p>
                <p style="margin: 15px 0 10px 0; color: #333333; font-size: 14px; font-weight: 600;">
                  Speakers from Orange Business:
                </p>
                <ul style="margin: 0 0 0 20px; padding: 0; color: #666666; font-size: 14px; line-height: 1.8;">
                  ${orangeBusinessSpeakers.map(speaker => `<li>${speaker}</li>`).join('')}
                </ul>
              </div>
              
              <!-- Social Media Section -->
              <div style="margin: 30px 0; padding: 20px; background-color: #f9f9f9; border-radius: 6px;">
                <p style="margin: 0 0 15px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                  If you haven't already, make sure to join our MSP group and follow us to stay updated on events and announcements:
                </p>
                <p style="margin: 10px 0;">
                  <a href="${instagramLink}" style="color: #E4405F; text-decoration: none; font-size: 14px; font-weight: 600;">📷 Instagram</a>
                </p>
                <p style="margin: 10px 0;">
                  <a href="${tiktokLink}" style="color: #000000; text-decoration: none; font-size: 14px; font-weight: 600;">🎵 TikTok</a>
                </p>
              </div>
              
              <p style="margin: 30px 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                We're so glad to have you with us - <strong>welcome to the MSP MIU family!</strong>
              </p>
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                Can't wait to see you at the Opening Session!
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #f9f9f9; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px; border-top: 1px solid #eeeeee;">
              <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.5;">
                Cheers,<br>
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
 * Send acceptance emails to all members
 */
async function sendAcceptanceEmails() {
  try {
    console.log('🚀 Starting acceptance email sending process...\n');
    
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
    
    // Fetch all members with their departments
    console.log('📊 Fetching members from database...');
    const members = await Member.findAll({
      include: [{
        model: Department,
        as: 'department',
        attributes: ['name']
      }],
      attributes: ['member_id', 'full_name', 'email', 'department_id']
    });
    
    console.log(`✅ Found ${members.length} member(s) in the database.\n`);
    
    if (members.length === 0) {
      console.log('ℹ️  No members found. Exiting...');
      await sequelize.close();
      return;
    }
    
    // Statistics
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    const skipped = [];
    
    // Send email to each member
    console.log('📨 Sending acceptance emails...\n');
    
    for (const member of members) {
      try {
        const studentName = member.full_name;
        const email = member.email;
        const department = member.department;
        
        if (!department || !department.name) {
          console.warn(`⚠️  Member ${studentName} (${email}) has no department assigned. Skipping...`);
          skipped.push({ name: studentName, email, reason: 'No department assigned' });
          continue;
        }
        
        const departmentName = department.name;
        const departmentLink = departmentWhatsAppLinks[departmentName];
        
        if (!departmentLink) {
          console.warn(`⚠️  No WhatsApp link found for department: ${departmentName}. Skipping ${studentName}...`);
          skipped.push({ name: studentName, email, reason: `No WhatsApp link for department: ${departmentName}` });
          continue;
        }
        
        // Generate email content
        const plainText = generatePlainTextEmail(studentName, departmentName, departmentLink);
        const htmlContent = generateHtmlEmail(studentName, departmentName, departmentLink);
        
        // Prepare email options
        const mailOptions = {
          to: email,
          fromName: 'MSP MIU Website',
          subject: `Congratulations! Welcome to ${departmentName} Department - MSP MIU`,
          text: plainText,
          html: htmlContent,
          headers: {
            'X-Entity-Ref-ID': `acceptance-${member.member_id}-${Date.now()}`,
          },
        };
        
        // Send email
        console.log(`📤 Sending email to ${studentName} (${email}) - ${departmentName}...`);
        await sendEmail(mailOptions);
        successCount++;
        console.log(`   ✅ Email sent successfully to ${studentName}\n`);
        
        // Add a small delay to avoid overwhelming the email server
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        errorCount++;
        const errorMsg = `Failed to send email to ${member.full_name} (${member.email}): ${error.message}`;
        console.error(`   ❌ ${errorMsg}\n`);
        errors.push({
          name: member.full_name,
          email: member.email,
          error: error.message
        });
      }
    }
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 EMAIL SENDING SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully sent: ${successCount} email(s)`);
    console.log(`❌ Failed: ${errorCount} email(s)`);
    console.log(`⚠️  Skipped: ${skipped.length} member(s)`);
    console.log(`📧 Total processed: ${members.length} member(s)\n`);
    
    if (skipped.length > 0) {
      console.log('⚠️  SKIPPED MEMBERS:');
      skipped.forEach(({ name, email, reason }) => {
        console.log(`   - ${name} (${email}): ${reason}`);
      });
      console.log();
    }
    
    if (errors.length > 0) {
      console.log('❌ ERRORS:');
      errors.forEach(({ name, email, error }) => {
        console.log(`   - ${name} (${email}): ${error}`);
      });
      console.log();
    }
    
    if (successCount > 0) {
      console.log('🎉 Acceptance emails sent successfully!');
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
sendAcceptanceEmails();

