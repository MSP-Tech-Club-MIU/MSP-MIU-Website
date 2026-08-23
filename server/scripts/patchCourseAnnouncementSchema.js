/**
 * Targeted schema patch for course announcements / communications.
 * Safe to re-run.
 */
require('dotenv').config();
const sequelize = require('../config/db');
const { listDefaultTemplates } = require('../utils/emailTemplates/defaults');

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
    console.log('Database connected.');

    if (!(await tableExists('course_announcements'))) {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS course_announcements (
          announcement_id INT AUTO_INCREMENT PRIMARY KEY,
          course_id INT NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          created_by INT NOT NULL,
          is_active TINYINT(1) NOT NULL DEFAULT 1,
          send_email TINYINT(1) NOT NULL DEFAULT 1,
          target_type ENUM('all', 'enrolled', 'preordered', 'attended', 'individual') NOT NULL DEFAULT 'all',
          target_enrollment_id INT NULL,
          target_email VARCHAR(255) NULL,
          cta_label VARCHAR(80) NULL,
          cta_url VARCHAR(512) NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_course_id (course_id),
          INDEX idx_created_by (created_by),
          INDEX idx_target_enrollment_id (target_enrollment_id),
          INDEX idx_target_type (target_type),
          CONSTRAINT fk_ca_course FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
          CONSTRAINT fk_ca_creator FOREIGN KEY (created_by) REFERENCES users(user_id),
          CONSTRAINT fk_ca_target_enrollment FOREIGN KEY (target_enrollment_id) REFERENCES course_enrollments(enrollment_id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      console.log('created course_announcements table');
    } else {
      console.log('skip course_announcements (exists)');
      await addColumn('course_announcements', 'target_type', "target_type ENUM('all', 'enrolled', 'preordered', 'attended', 'individual') NOT NULL DEFAULT 'all'");
      await addColumn('course_announcements', 'target_enrollment_id', 'target_enrollment_id INT NULL');
      await addColumn('course_announcements', 'target_email', 'target_email VARCHAR(255) NULL');
      await addColumn('course_announcements', 'cta_label', 'cta_label VARCHAR(80) NULL');
      await addColumn('course_announcements', 'cta_url', 'cta_url VARCHAR(512) NULL');
      await addColumn('course_announcements', 'send_email', 'send_email TINYINT(1) NOT NULL DEFAULT 1');
      await addColumn('course_announcements', 'is_active', 'is_active TINYINT(1) NOT NULL DEFAULT 1');
    }

    // Seed course_announcement template if email_templates table exists
    if (await tableExists('email_templates')) {
      const defaults = listDefaultTemplates();
      const courseTpl = defaults.find((t) => t.template_key === 'course_announcement');
      if (courseTpl) {
        const [existing] = await sequelize.query(
          'SELECT template_key FROM email_templates WHERE template_key = ? LIMIT 1',
          { replacements: [courseTpl.template_key] }
        );
        if (existing.length === 0) {
          await sequelize.query(
            `INSERT INTO email_templates
              (template_key, name, category, subject, html_body, text_body, placeholders, meta, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, CAST(? AS JSON), CAST(? AS JSON), NOW())`,
            {
              replacements: [
                courseTpl.template_key,
                courseTpl.name,
                courseTpl.category,
                courseTpl.subject,
                courseTpl.html_body,
                courseTpl.text_body,
                JSON.stringify(courseTpl.placeholders),
                courseTpl.meta != null ? JSON.stringify(courseTpl.meta) : null
              ]
            }
          );
          console.log('seeded course_announcement email template');
        } else {
          console.log('skip seed course_announcement (exists)');
        }
      }
    }

    console.log('Course announcement schema patch complete.');
  } catch (e) {
    console.error('Patch failed:', e.parent?.sqlMessage || e.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
})();
