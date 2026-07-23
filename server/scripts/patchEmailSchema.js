/**
 * Targeted schema patch for email templates + department WhatsApp URLs.
 * Safe to re-run.
 */
require('dotenv').config();
const sequelize = require('../config/db');
const { listDefaultTemplates, DEFAULT_WHATSAPP_LINKS } = require('../utils/emailTemplates/defaults');

async function columnExists(table, column) {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS c
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    { replacements: [table, column] }
  );
  return Number(rows[0]?.c) > 0;
}

async function tableExists(table) {
  const [rows] = await sequelize.query(
    `SELECT COUNT(*) AS c
     FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?`,
    { replacements: [table] }
  );
  return Number(rows[0]?.c) > 0;
}

async function addColumn(table, column, ddl) {
  if (await columnExists(table, column)) {
    console.log(`skip ${table}.${column} (exists)`);
    return;
  }
  await sequelize.query(`ALTER TABLE \`${table}\` ADD COLUMN ${ddl}`);
  console.log(`added ${table}.${column}`);
}

(async () => {
  try {
    await sequelize.authenticate();

    if (!(await tableExists('email_templates'))) {
      await sequelize.query(`
        CREATE TABLE email_templates (
          template_key VARCHAR(64) NOT NULL PRIMARY KEY,
          name VARCHAR(128) NOT NULL,
          category ENUM('account','announcement','competition','system') NOT NULL DEFAULT 'system',
          subject VARCHAR(255) NOT NULL,
          html_body LONGTEXT NOT NULL,
          text_body LONGTEXT NOT NULL,
          placeholders JSON NOT NULL,
          meta JSON NULL,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      console.log('created email_templates');
    } else {
      console.log('skip email_templates (exists)');
    }

    await addColumn('departments', 'whatsapp_group_url', 'whatsapp_group_url VARCHAR(512) NULL');
    if (await tableExists('email_templates')) {
      await addColumn('email_templates', 'meta', 'meta JSON NULL');
    }

    const defaults = listDefaultTemplates();
    for (const tpl of defaults) {
      const [existing] = await sequelize.query(
        'SELECT template_key FROM email_templates WHERE template_key = ? LIMIT 1',
        { replacements: [tpl.template_key] }
      );
      if (existing.length > 0) {
        console.log(`skip seed ${tpl.template_key} (exists)`);
        continue;
      }
      await sequelize.query(
        `INSERT INTO email_templates
          (template_key, name, category, subject, html_body, text_body, placeholders, meta, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, CAST(? AS JSON), CAST(? AS JSON), NOW())`,
        {
          replacements: [
            tpl.template_key,
            tpl.name,
            tpl.category,
            tpl.subject,
            tpl.html_body,
            tpl.text_body,
            JSON.stringify(tpl.placeholders),
            tpl.meta != null ? JSON.stringify(tpl.meta) : null
          ]
        }
      );
      console.log(`seeded ${tpl.template_key}`);
    }

    for (const [name, url] of Object.entries(DEFAULT_WHATSAPP_LINKS)) {
      const [result] = await sequelize.query(
        `UPDATE departments
         SET whatsapp_group_url = ?
         WHERE name = ?
           AND (whatsapp_group_url IS NULL OR whatsapp_group_url = '')`,
        { replacements: [url, name] }
      );
      const affected = result?.affectedRows ?? result;
      console.log(`whatsapp ${name}: updated ${typeof affected === 'number' ? affected : '?'}`);
    }

    console.log('Email schema patch complete.');
  } catch (e) {
    console.error('Patch failed:', e.parent?.sqlMessage || e.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
})();
