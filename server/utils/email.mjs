import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true', // true for SSL (465), false for TLS (587)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  // Allow self-signed certificates (common in development or certain SMTP servers)
  tls: {
    rejectUnauthorized: false
  }
});

/**
 * Send an email using the configured transporter
 * @param {Object} mailOptions - Email options (to, subject, text, html, etc.)
 * @param {string} mailOptions.fromName - Optional sender name (defaults to "MSP MIU Website")
 * @returns {Promise} Promise that resolves with email info
 */
export async function sendEmail(mailOptions) {
  try {
    const fromName = mailOptions.fromName || process.env.SMTP_FROM_NAME || 'MSP MIU Website';
    const fromEmail = process.env.SMTP_USER || mailOptions.from || 'noreply@msp-miu.tech';
    
    if (!process.env.SMTP_USER && !mailOptions.from) {
      console.warn('⚠️  Warning: SMTP_USER not set in .env file. Using default from address.');
    }
    
    // Extract domain from email address for proper Message-ID
    const emailDomain = fromEmail.split('@')[1] || process.env.SMTP_HOST || 'msp-miu.tech';
    
    // Escape quotes in the name and format from address
    const escapedName = fromName.replace(/"/g, '\\"');
    const fromAddress = `"${escapedName}" <${fromEmail}>`;
    
    // Generate a proper RFC-compliant Message-ID using the domain
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const messageId = `<${timestamp}.${randomId}@${emailDomain}>`;
    
    // Get current date in RFC 2822 format
    const date = new Date().toUTCString();
    
    // Prepare email with advanced anti-spam best practices
    const emailData = {
      from: fromAddress,
      replyTo: mailOptions.replyTo || fromEmail,
      to: mailOptions.to,
      subject: mailOptions.subject,
      text: mailOptions.text, // Always include plain text version
      html: mailOptions.html,
      // Advanced headers to improve deliverability and reduce spam
      headers: {
        'Message-ID': messageId,
        'Date': date,
        'X-Mailer': 'MSP MIU Website',
        'X-Priority': '3', // Normal priority
        'Importance': 'normal',
        'Precedence': 'bulk', // Helps with automated emails
        'Auto-Submitted': 'auto-generated', // Indicates automated email
        'X-Auto-Response-Suppress': 'All', // Prevents auto-replies
        'X-Entity-Ref-ID': `${timestamp}-${randomId}`, // Unique reference
        ...mailOptions.headers, // Allow custom headers to override
      },
    };

    const info = await transporter.sendMail(emailData);
    console.log('Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

/**
 * Verify the email transporter configuration
 * @returns {Promise<boolean>} True if configuration is valid
 */
export async function verifyEmailConfig() {
  try {
    await transporter.verify();
    console.log('Email transporter is ready to send emails');
    return true;
  } catch (error) {
    console.error('Email transporter verification failed:', error);
    return false;
  }
}

export default transporter;

