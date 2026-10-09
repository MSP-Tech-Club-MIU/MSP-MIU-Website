/**
 * Script to scan Cloudflare R2 cloud storage and clean up unused Meet the Board photos
 * and user profile pictures that are not active in the database.
 *
 * Usage:
 *   node server/scripts/cleanupUnusedImages.js          (Dry-run: inspect only)
 *   node server/scripts/cleanupUnusedImages.js --apply  (Apply: delete unused images from R2)
 *   node server/scripts/cleanupUnusedImages.js --apply --force (Delete immediately ignoring grace period)
 */
require('dotenv').config();
const { sequelize } = require('../models');
const { cleanupAllUnusedImages } = require('../services/cloudStorageCleanup');

async function run() {
  const apply = process.argv.includes('--apply');
  const force = process.argv.includes('--force');
  const dryRun = !apply;

  let minAgeMinutes = 5;
  const minAgeArg = process.argv.find((arg) => arg.startsWith('--min-age='));
  if (minAgeArg) {
    const val = Number(minAgeArg.split('=')[1]);
    if (!isNaN(val) && val >= 0) minAgeMinutes = val;
  }

  console.log('='.repeat(65));
  console.log(' Cloud Storage Unused Images Cleanup');
  console.log(` Mode: ${dryRun ? 'DRY RUN (preview only)' : 'LIVE APPLY (will delete from R2)'}`);
  console.log(` Grace period: ${force ? 'None (--force)' : `${minAgeMinutes} minutes`}`);
  console.log('='.repeat(65));

  try {
    await sequelize.authenticate();
    console.log(' Database connected.');

    const result = await cleanupAllUnusedImages({
      dryRun,
      minAgeMinutes,
      force
    });

    const { summary, deleted } = result;

    console.log('\n--- Scan Summary ---');
    console.log(`Meet the Board Photos:`);
    console.log(`  - Total in Storage:     ${summary.boardPhotosScanned}`);
    console.log(`  - Active in Database:   ${summary.boardPhotosActive}`);
    console.log(`  - Unused / Inactive:    ${summary.boardPhotosUnused}`);
    if (!dryRun) {
      console.log(`  - Deleted from Storage: ${summary.boardPhotosDeleted}`);
    }

    console.log(`\nUser Profile Pictures:`);
    console.log(`  - Total in Storage:     ${summary.profilePicturesScanned}`);
    console.log(`  - Active in Database:   ${summary.profilePicturesActive}`);
    console.log(`  - Unused / Inactive:    ${summary.profilePicturesUnused}`);
    if (!dryRun) {
      console.log(`  - Deleted from Storage: ${summary.profilePicturesDeleted}`);
    }

    if (summary.legacyBoardScanned > 0) {
      console.log(`\nLegacy Board Images (Images/board_*):`);
      console.log(`  - Total in Storage:     ${summary.legacyBoardScanned}`);
      console.log(`  - Unused / Inactive:    ${summary.legacyBoardUnused}`);
      if (!dryRun) {
        console.log(`  - Deleted from Storage: ${summary.legacyBoardDeleted}`);
      }
    }

    console.log('\n--- Unused Files Identified ---');
    if (deleted.boardPhotos.length > 0) {
      console.log(`Board Photos (${deleted.boardPhotos.length}):`);
      deleted.boardPhotos.forEach((k) => console.log(`  - ${k}`));
    } else {
      console.log('No unused Meet the Board photos found.');
    }

    if (deleted.profilePictures.length > 0) {
      console.log(`\nProfile Pictures (${deleted.profilePictures.length}):`);
      deleted.profilePictures.forEach((k) => console.log(`  - ${k}`));
    } else {
      console.log('No unused user profile pictures found.');
    }

    if (deleted.legacyBoardPhotos?.length > 0) {
      console.log(`\nLegacy Board Photos (${deleted.legacyBoardPhotos.length}):`);
      deleted.legacyBoardPhotos.forEach((k) => console.log(`  - ${k}`));
    }

    console.log('\n' + '='.repeat(65));
    if (dryRun) {
      console.log(`Result: ${summary.totalUnused} unused file(s) would be deleted.`);
      console.log('To execute deletion, rerun with:');
      console.log('  node server/scripts/cleanupUnusedImages.js --apply');
    } else {
      console.log(`Result: ${summary.totalDeleted} unused file(s) successfully deleted from R2!`);
    }
    console.log('='.repeat(65));

    process.exit(0);
  } catch (error) {
    console.error('\nCleanup script failed:', error);
    process.exit(1);
  }
}

run();
