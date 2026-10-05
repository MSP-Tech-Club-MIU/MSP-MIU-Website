/**
 * Activity Feedback schema patch:
 * Creates `activity_feedbacks` table supporting feedback on courses, lessons, events, competitions, and general club feedback.
 * Safely migrates legacy rows from `event_feedback`.
 * Safe to re-run.
 */
require('dotenv').config();
const sequelize = require('../config/db');

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

async function run() {
  try {
    await sequelize.authenticate();
    console.log('Database connected.');

    const exists = await tableExists('activity_feedbacks');
    if (!exists) {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS activity_feedbacks (
          feedback_id INT AUTO_INCREMENT PRIMARY KEY,
          target_type ENUM('general', 'course', 'event', 'lesson', 'competition') NOT NULL DEFAULT 'general',
          target_id INT NULL,
          course_id INT NULL,
          rating TINYINT UNSIGNED NULL,
          positives TEXT NULL,
          negatives TEXT NULL,
          feedback TEXT NULL,
          user_id INT NULL,
          name VARCHAR(120) NULL,
          email VARCHAR(255) NULL,
          anonymous TINYINT(1) NOT NULL DEFAULT 0,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_fb_target (target_type, target_id),
          INDEX idx_fb_course_id (course_id),
          INDEX idx_fb_rating (rating),
          INDEX idx_fb_created_at (created_at),
          INDEX idx_fb_user_id (user_id),
          CONSTRAINT fk_fb_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      console.log('Created activity_feedbacks table');
    } else {
      console.log('Table activity_feedbacks already exists, verifying columns...');
      await addColumn('activity_feedbacks', 'target_type', "target_type ENUM('general', 'course', 'event', 'lesson', 'competition') NOT NULL DEFAULT 'general'");
      await addColumn('activity_feedbacks', 'target_id', 'target_id INT NULL');
      await addColumn('activity_feedbacks', 'course_id', 'course_id INT NULL');
      await addColumn('activity_feedbacks', 'rating', 'rating TINYINT UNSIGNED NULL');
      await addColumn('activity_feedbacks', 'positives', 'positives TEXT NULL');
      await addColumn('activity_feedbacks', 'negatives', 'negatives TEXT NULL');
      await addColumn('activity_feedbacks', 'feedback', 'feedback TEXT NULL');
      await addColumn('activity_feedbacks', 'user_id', 'user_id INT NULL');
      await addColumn('activity_feedbacks', 'name', 'name VARCHAR(120) NULL');
      await addColumn('activity_feedbacks', 'email', 'email VARCHAR(255) NULL');
      await addColumn('activity_feedbacks', 'anonymous', 'anonymous TINYINT(1) NOT NULL DEFAULT 0');
      await addColumn('activity_feedbacks', 'created_at', 'created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');
    }

    // Safely copy legacy event_feedback rows if table exists
    if (await tableExists('event_feedback')) {
      const [legacyRows] = await sequelize.query(`
        SELECT ef.feedback_id, ef.event_id, ef.feedback, ef.created_at
        FROM event_feedback ef
      `);

      if (legacyRows.length > 0) {
        console.log(`Found ${legacyRows.length} legacy event_feedback rows. Checking sync...`);
        let importedCount = 0;
        for (const row of legacyRows) {
          // Check if already migrated
          const [found] = await sequelize.query(
            `SELECT feedback_id FROM activity_feedbacks WHERE target_type = 'event' AND target_id = ? AND feedback = ? LIMIT 1`,
            { replacements: [row.event_id, row.feedback] }
          );
          if (found.length === 0) {
            await sequelize.query(
              `INSERT INTO activity_feedbacks (target_type, target_id, feedback, created_at)
               VALUES ('event', ?, ?, ?)`,
              { replacements: [row.event_id, row.feedback, row.created_at || new Date()] }
            );
            importedCount++;
          }
        }
        console.log(`Migrated ${importedCount} legacy event feedbacks.`);
      }
    }

    console.log('Feedback schema patch complete.');
  } catch (err) {
    console.error('Feedback schema patch failed:', err.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

run();
