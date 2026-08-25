const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config();

const { EmailTemplate } = require('../models');
const { listDefaultTemplates } = require('../utils/emailTemplates/defaults');
const logger = require('../utils/logger');

async function syncAll() {
  const defaults = listDefaultTemplates();
  console.log(`Syncing ${defaults.length} email templates to DB...`);

  for (const tpl of defaults) {
    await EmailTemplate.upsert({
      template_key: tpl.template_key,
      name: tpl.name,
      category: tpl.category,
      subject: tpl.subject,
      html_body: tpl.html_body,
      text_body: tpl.text_body,
      placeholders: tpl.placeholders,
      meta: tpl.meta || null,
      updated_at: new Date()
    });
    console.log(`✔ Synced [${tpl.template_key}] to DB`);
  }

  console.log('\nAll templates synced successfully to database!');
  process.exit(0);
}

syncAll().catch((err) => {
  console.error('Failed to sync email templates to DB:', err);
  process.exit(1);
});
