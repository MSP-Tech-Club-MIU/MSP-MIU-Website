/**
 * Build competition announcement email content
 * @param {Object} announcement - CompetitionAnnouncement object
 * @param {Object} competition - Competition object
 * @param {Object} options - Configuration options
 * @returns {Object} Email object with subject, text, and html
 */
export function buildCompetitionAnnouncementEmail(announcement, competition, options = {}) {
  const { frontendUrl = 'https://msp-miu.com' } = options;
  
  const competitionLink = `${frontendUrl}/competitions/${announcement.competition_id}`;
  
  const subject = `${competition.title} - ${announcement.title}`;
  
  const text = `
Hi Competitor,

You have received a new announcement for the competition: ${competition.title}

Title: ${announcement.title}

Message:
${announcement.message}

View the competition: ${competitionLink}

---
This is an automated message from MSP MIU Competition Management System.
  `.trim();
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: Arial, sans-serif;
      color: #333;
      line-height: 1.6;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f9f9f9;
      border: 1px solid #ddd;
      border-radius: 5px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 5px 5px 0 0;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content {
      padding: 20px;
      background-color: white;
    }
    .competition-title {
      color: #667eea;
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .announcement-title {
      font-size: 16px;
      font-weight: bold;
      color: #333;
      margin-top: 15px;
      margin-bottom: 10px;
    }
    .announcement-message {
      background-color: #f5f5f5;
      padding: 15px;
      border-left: 4px solid #667eea;
      margin: 15px 0;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .button {
      display: inline-block;
      background-color: #667eea;
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 5px;
      margin-top: 15px;
      font-weight: bold;
    }
    .button:hover {
      background-color: #764ba2;
    }
    .footer {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      font-size: 12px;
      color: #666;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📢 New Competition Announcement</h1>
    </div>
    <div class="content">
      <p>Hi Competitor,</p>
      <p>You have received a new announcement for the competition:</p>
      
      <div class="competition-title">${escapeHtml(competition.title)}</div>
      
      <div class="announcement-title">${escapeHtml(announcement.title)}</div>
      
      <div class="announcement-message">${escapeHtml(announcement.message)}</div>
      
      <a href="${competitionLink}" class="button">View Competition</a>
      
      <div class="footer">
        <p>This is an automated message from MSP MIU Competition Management System.</p>
        <p>Please do not reply to this email.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
  
  return {
    subject,
    text,
    html
  };
}

/**
 * Escape HTML special characters
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}
