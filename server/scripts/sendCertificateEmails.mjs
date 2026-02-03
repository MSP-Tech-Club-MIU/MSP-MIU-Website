/**
 * Send Front-End Course Certificates via Email
 * 
 * This script reads student data from a CSV file and sends personalized emails
 * with certificate attachments to each student.
 * 
 * CSV Format Required:
 * - Must contain columns: name (or full_name) and id (or university_id)
 * - Email addresses are auto-generated from name and ID
 * - Format: firstname + ID (without slashes) + @miuegypt.edu.eg
 * - Example: "Mohamed Hesham" + "2023/00428" -> "mohamed2300428@miuegypt.edu.eg"
 * - Optional: If CSV has email column, it will be used instead of generated email
 * 
 * Certificate Naming:
 * - Format: firstnameID.pdf (e.g., areej2507356.pdf)
 * - ID format: last 2 digits of year + 5-digit number (e.g., 2025/07356 -> 2507356)
 * 
 * Environment Variables:
 * - FEEDBACK_FORM_URL: Google Forms feedback form URL (optional, defaults to placeholder)
 * - WAEL_CONTRIBUTOR_ID: Contributor ID for Microsoft Learn links (optional)
 * 
 * Usage:
 *   npm run send-certificate-emails
 *   or
 *   node server/scripts/sendCertificateEmails.mjs
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendEmail, verifyEmailConfig } from '../utils/email.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Configuration
const CSV_FILE_PATH = path.join(__dirname, '../../Certificates Names - Front End Course .csv');
const CERTIFICATES_DIR = path.join(__dirname, '../../certificates');
const FEEDBACK_FORM_URL = process.env.FEEDBACK_FORM_URL || 'https://forms.gle/YOUR_FEEDBACK_FORM_ID';
const GITHUB_COPILOT_MODULE_URL = 'https://learn.microsoft.com/en-us/training/modules/introduction-to-github-copilot/';
const WAEL_CONTRIBUTOR_ID = process.env.WAEL_CONTRIBUTOR_ID || 'YOUR_CONTRIBUTOR_ID';
const WEBSITE_URL = process.env.WEBSITE_URL || process.env.FRONTEND_URL || 'https://msp-miu.tech';
const LOGO_URL = process.env.LOGO_URL || `${WEBSITE_URL}/src/assets/Images/MSP%20-%20Logo.png`;

/**
 * Parse CSV file and return array of student objects
 */
function parseCSV(csvPath) {
  try {
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header row and one data row');
    }
    
    // Parse header
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    
    // Find column indices
    const nameIndex = headers.findIndex(h => 
      h.toLowerCase().includes('name') || h.toLowerCase().includes('full_name')
    );
    const idIndex = headers.findIndex(h => 
      h.toLowerCase().includes('id') || h.toLowerCase().includes('university_id')
    );
    const emailIndex = headers.findIndex(h => 
      h.toLowerCase().includes('email')
    );
    
    if (nameIndex === -1 || idIndex === -1) {
      throw new Error('CSV must contain columns: name and id (email will be auto-generated)');
    }
    
    // Parse data rows
    const students = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Handle quoted CSV values
      const values = [];
      let currentValue = '';
      let inQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(currentValue.trim());
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      values.push(currentValue.trim()); // Add last value
      
      const name = values[nameIndex]?.replace(/^"|"$/g, '') || '';
      const id = values[idIndex]?.replace(/^"|"$/g, '') || '';
      // Use email from CSV if available, otherwise generate it
      const email = emailIndex !== -1 && values[emailIndex]?.replace(/^"|"$/g, '').trim()
        ? values[emailIndex].replace(/^"|"$/g, '').trim()
        : generateEmail(name, id);
      
      if (name && id) {
        students.push({ name, id, email });
      }
    }
    
    return students;
  } catch (error) {
    throw new Error(`Failed to parse CSV file: ${error.message}`);
  }
}

/**
 * Extract first name from full name
 */
function getFirstName(fullName) {
  if (!fullName) return '';
  return fullName.trim().split(/\s+/)[0].toLowerCase();
}

/**
 * Generate email address from name and university ID
 * Format: firstname + ID (without slashes) + @miuegypt.edu.eg
 * Example: "Mohamed Hesham" + "2023/00428" -> "mohamed2300428@miuegypt.edu.eg"
 */
function generateEmail(fullName, universityId) {
  if (!fullName || !universityId) return '';
  
  const firstName = getFirstName(fullName);
  // Remove slashes and spaces from ID: 2023/00428 -> 202300428 -> 2300428 (last 7 digits)
  const cleanId = universityId.replace(/\s+/g, '').replace(/\//g, '');
  // Use last 7 digits (year suffix + number)
  const idSuffix = cleanId.slice(-7);
  
  return `${firstName}${idSuffix}@miuegypt.edu.eg`;
}

/**
 * Convert university ID to certificate ID format
 * Example: 2025/06009 -> 2506009, 2024/06330 -> 2406330
 */
function convertIdToCertificateFormat(universityId) {
  if (!universityId) return '';
  
  // Remove any spaces and extract year and number
  const cleanId = universityId.replace(/\s+/g, '');
  
  // Match pattern: YYYY/NNNNN or YYYY/NNNN or YYYY/NNN
  const match = cleanId.match(/(\d{4})\/(\d{3,5})/);
  if (match) {
    const year = match[1]; // e.g., "2025"
    const number = match[2]; // e.g., "06009" or "6330"
    const yearSuffix = year.slice(-2); // e.g., "25"
    // Pad number to 5 digits (some IDs might be shorter)
    const paddedNumber = number.padStart(5, '0');
    return `${yearSuffix}${paddedNumber}`;
  }
  
  return '';
}

/**
 * Find certificate file based on email address
 * Extracts the part before @ and tries variations (lowercase, capitalized, etc.)
 */
function findCertificateFileFromEmail(email) {
  if (!email || !email.includes('@')) return null;
  
  // Extract the part before @ (e.g., "mohamed2300428" from "mohamed2300428@miuegypt.edu.eg")
  const emailPrefix = email.split('@')[0];
  
  if (!emailPrefix) return null;
  
  // Generate all possible filename variations
  const lowercase = emailPrefix.toLowerCase();
  const capitalized = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
  const uppercase = emailPrefix.toUpperCase();
  
  const variations = [
    `${lowercase}.pdf`, // lowercase (most common)
    `${capitalized}.pdf`, // Capitalized
    `${uppercase}.pdf`, // UPPERCASE
    `${emailPrefix}.pdf`, // Original case
  ];
  
  // Remove duplicates
  const uniqueVariations = [...new Set(variations)];
  
  for (const filename of uniqueVariations) {
    const filePath = path.join(CERTIFICATES_DIR, filename);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }
  
  return null;
}

/**
 * Generate LinkedIn post text (without @ tag since it doesn't work in URLs)
 */
function generateLinkedInPostText(studentName) {
  const postText = `🎉 Excited to share that I've completed the Front-End Course with MSP Tech Club - MIU at Misr International University! 

Grateful for the opportunity to learn and grow with such an amazing community. Looking forward to applying these skills in future projects!

#MSPTechClub #MIU #FrontEndDevelopment #WebDevelopment #TechCommunity`;

  return encodeURIComponent(postText);
}

/**
 * Generate plain text email content
 */
function generatePlainTextEmail(studentName, feedbackFormUrl, linkedInPostUrl, githubCopilotUrl) {
  return `Hi ${studentName},

Congratulations on completing the Front-End Course with MSP Tech Club! 🎉

✅ Certificate attached

📝 Feedback Form
We'd love to hear about your experience! Please take a moment to fill out our feedback form:
${feedbackFormUrl}

🔗 LinkedIn Sharing
Share your achievement on LinkedIn! We encourage you to upload your certificate and let your network know about your accomplishment.

Share on LinkedIn: ${linkedInPostUrl}

🚀 Next Steps
Continue your learning journey with the GitHub Copilot module on Microsoft Learn:
${githubCopilotUrl}

We highly encourage you to complete this module to further enhance your development skills.

🏆 What's Next
We're excited to announce that a Frontend Competition is coming later this semester! Stay tuned for more details - we'll be sharing information about this exciting opportunity soon.

Keep up the great work, and we look forward to seeing you in future MSP activities!

Best regards,
MSP MIU Team`;
}

/**
 * Generate HTML email content - improved design without gradients
 */
function generateHtmlEmail(studentName, feedbackFormUrl, linkedInPostUrl, githubCopilotUrl) {
  const linkedInPostText = `🎉 Excited to share that I've completed the Front-End Course with MSP Tech Club - MIU at Misr International University! 

Grateful for the opportunity to learn and grow with such an amazing community. Looking forward to applying these skills in future projects!

#MSPTechClub #MIU #FrontEndDevelopment #WebDevelopment #TechCommunity`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <title>Your Front-End Course Certificate - MSP Tech Club</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 30px 40px; background-color: #031C35; border-top-left-radius: 8px; border-top-right-radius: 8px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">MSP Tech Club</h1>
              <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Misr International University</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                Hi ${studentName},
              </p>
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                <strong>Congratulations on completing the Front-End Course with MSP Tech Club! 🎉</strong>
              </p>
              
              <!-- Certificate Section -->
              <div style="margin: 30px 0; padding: 20px; background-color: #e8f5e9; border-radius: 6px; border-left: 4px solid #4caf50;">
                <p style="margin: 0; color: #333333; font-size: 16px; line-height: 1.6;">
                  ✅ <strong>Certificate attached</strong>
                </p>
                <p style="margin: 10px 0 0 0; color: #666666; font-size: 14px; line-height: 1.6;">
                  Your certificate is attached to this email. Congratulations on this achievement!
                </p>
              </div>
              
              <!-- Feedback Form Section -->
              <div style="margin: 30px 0; padding: 20px; background-color: #eaf2ff; border-radius: 6px; border-left: 4px solid #03A9F4;">
                <h2 style="margin: 0 0 15px 0; color: #333333; font-size: 18px; font-weight: 600;">
                  📝 Feedback Form
                </h2>
                <p style="margin: 0 0 15px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                  We'd love to hear about your experience! Please take a moment to fill out our feedback form.
                </p>
                <div style="margin: 15px 0; text-align: center;">
                  <a href="${feedbackFormUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0d7bd8; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; box-shadow: 0 2px 4px rgba(13, 123, 216, 0.3);">
                    Fill Out Feedback Form
                  </a>
                </div>
              </div>
              
              <!-- LinkedIn Sharing Section -->
              <div style="margin: 30px 0; padding: 20px; background-color: #f5f5f5; border-radius: 6px; border-left: 4px solid #666666;">
                <h2 style="margin: 0 0 15px 0; color: #333333; font-size: 18px; font-weight: 600;">
                  LinkedIn Sharing
                </h2>
                <p style="margin: 0 0 20px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                  Share your achievement on LinkedIn. Attach your certificate PDF and add "@" before "MSP Tech Club - MIU" to tag our company page.
                </p>
                
                <div style="margin: 15px 0; padding: 15px; background-color: #ffffff; border-radius: 6px; border: 1px solid #e0e0e0;">
                  <p style="margin: 0 0 10px 0; color: #333333; font-size: 13px; font-weight: 600;">
                    Suggested Post:
                  </p>
                  <p style="margin: 0; color: #666666; font-size: 12px; line-height: 1.6; font-style: italic;">
                    ${linkedInPostText.replace(/\n/g, '<br>')}
                  </p>
                </div>
                
                <div style="margin: 15px 0; text-align: center;">
                  <a href="${linkedInPostUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0077b5; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
                    Share on LinkedIn
                  </a>
                </div>
              </div>
              
              <!-- Next Steps Section -->
              <div style="margin: 30px 0; padding: 20px; background-color: #f3e5f5; border-radius: 6px; border-left: 4px solid #9c27b0;">
                <h2 style="margin: 0 0 15px 0; color: #333333; font-size: 18px; font-weight: 600;">
                  🚀 Next Steps
                </h2>
                <p style="margin: 0 0 15px 0; color: #666666; font-size: 14px; line-height: 1.6;">
                  Continue your learning journey with the GitHub Copilot module on Microsoft Learn. We highly encourage you to complete this module to further enhance your development skills.
                </p>
                <div style="margin: 15px 0; text-align: center;">
                  <a href="${githubCopilotUrl}" style="display: inline-block; padding: 12px 24px; background-color: #9c27b0; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; box-shadow: 0 2px 4px rgba(156, 39, 176, 0.3);">
                    Start GitHub Copilot Module
                  </a>
                </div>
              </div>
              
              <!-- What's Next Section -->
              <div style="margin: 30px 0; padding: 20px; background-color: #fff9c4; border-radius: 6px; border-left: 4px solid #fbc02d;">
                <h2 style="margin: 0 0 15px 0; color: #333333; font-size: 18px; font-weight: 600;">
                  🏆 What's Next
                </h2>
                <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;">
                  We're excited to announce that a <strong>Frontend Competition</strong> is coming later this semester! Stay tuned for more details - we'll be sharing information about this exciting opportunity soon.
                </p>
                <p style="margin: 15px 0 0 0; color: #666666; font-size: 13px; line-height: 1.6; font-style: italic;">
                  To be announced – stay tuned for details
                </p>
              </div>
              
              <p style="margin: 30px 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                Keep up the great work, and we look forward to seeing you in future MSP activities!
              </p>
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                <strong>Best regards,<br>MSP Tech Club Team</strong>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #f9f9f9; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px; border-top: 1px solid #eeeeee;">
              <p style="margin: 0; color: #666666; font-size: 12px; line-height: 1.5;">
                This is an automated email from MSP Tech Club. If you have any questions, please contact us.
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
 * Send certificate emails to all students
 */
async function sendCertificateEmails() {
  try {
    console.log('🚀 Starting certificate email sending process...\n');
    
    // Verify email configuration
    console.log('📧 Verifying email configuration...');
    const isVerified = await verifyEmailConfig();
    
    if (!isVerified) {
      console.error('❌ Email configuration verification failed. Please check your .env file.');
      process.exit(1);
    }
    console.log('✅ Email configuration verified.\n');
    
    // Check if CSV file exists
    if (!fs.existsSync(CSV_FILE_PATH)) {
      console.error(`❌ CSV file not found at: ${CSV_FILE_PATH}`);
      process.exit(1);
    }
    
    // Check if certificates directory exists
    if (!fs.existsSync(CERTIFICATES_DIR)) {
      console.error(`❌ Certificates directory not found at: ${CERTIFICATES_DIR}`);
      process.exit(1);
    }
    
    // Parse CSV file
    console.log('📊 Reading CSV file...');
    const students = parseCSV(CSV_FILE_PATH);
    console.log(`✅ Found ${students.length} student(s) in CSV file.\n`);
    
    if (students.length === 0) {
      console.log('ℹ️  No students found in CSV file. Exiting...');
      return;
    }
    
    // Prepare URLs
    const feedbackFormUrl = FEEDBACK_FORM_URL;
    const githubCopilotUrl = `${GITHUB_COPILOT_MODULE_URL}?wt.mc_id=DT-MVP-${WAEL_CONTRIBUTOR_ID}`;
    
    // Statistics
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    const errors = [];
    const skipped = [];
    
    // Send email to each student
    console.log('📨 Sending certificate emails...\n');
    
    for (const student of students) {
      try {
        const { name, id, email } = student;
        
        // Validate email
        if (!email || !email.includes('@')) {
          console.warn(`⚠️  Skipping ${name} - invalid email: ${email}`);
          skippedCount++;
          skipped.push({ name, email, reason: 'Invalid email format' });
          continue;
        }
        
        // Find certificate file based on email
        const emailPrefix = email.split('@')[0];
        const certificatePath = findCertificateFileFromEmail(email);
        
        if (!certificatePath) {
          console.warn(`⚠️  Certificate not found for ${name} (Email: ${email}). Expected filename: ${emailPrefix}.pdf (or variations)`);
          skippedCount++;
          skipped.push({ name, email, reason: `Certificate file not found (expected: ${emailPrefix}.pdf or variations)` });
          continue;
        }
        
        // Generate LinkedIn post URL (works on mobile and web)
        const linkedInPostText = generateLinkedInPostText(name);
        // Use feed URL with text parameter - works on both mobile apps and web
        const linkedInPostUrl = `https://www.linkedin.com/feed/?shareActive=true&text=${linkedInPostText}`;
        
        // Generate email content
        const plainText = generatePlainTextEmail(name, feedbackFormUrl, linkedInPostUrl, githubCopilotUrl);
        const htmlContent = generateHtmlEmail(name, feedbackFormUrl, linkedInPostUrl, githubCopilotUrl);
        
        // Read certificate file
        const certificateBuffer = fs.readFileSync(certificatePath);
        const certificateFilename = path.basename(certificatePath);
        
        // Prepare email options with attachment
        const mailOptions = {
          to: email,
          fromName: 'MSP Tech Club',
          subject: 'Your Front-End Course Certificate - MSP Tech Club',
          text: plainText,
          html: htmlContent,
          attachments: [
            {
              filename: certificateFilename,
              content: certificateBuffer,
              contentType: 'application/pdf'
            }
          ],
          headers: {
            'X-Entity-Ref-ID': `certificate-${emailPrefix}-${Date.now()}`,
          },
        };
        
        // Send email
        console.log(`📤 Sending certificate email to ${name} - ${email}...`);
        await sendEmail(mailOptions);
        successCount++;
        console.log(`   ✅ Email sent successfully to ${name}`);
        console.log(`   📎 Certificate: ${certificateFilename}\n`);
        
        // Add a small delay to avoid overwhelming the email server
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        errorCount++;
        const errorMsg = `Failed to send email to ${student.name}: ${error.message}`;
        console.error(`   ❌ ${errorMsg}\n`);
        errors.push({
          name: student.name,
          email: student.email,
          error: error.message
        });
      }
    }
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 CERTIFICATE EMAIL SENDING SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully sent: ${successCount} email(s)`);
    console.log(`❌ Failed: ${errorCount} email(s)`);
    console.log(`⚠️  Skipped: ${skippedCount} student(s)`);
    console.log(`📧 Total processed: ${students.length} student(s)\n`);
    
    if (skipped.length > 0) {
      console.log('⚠️  SKIPPED STUDENTS:');
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
      console.log('🎉 Certificate emails sent successfully!');
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
sendCertificateEmails();

