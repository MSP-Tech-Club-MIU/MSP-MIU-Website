/**
 * Comprehensive verification tests for cloud storage image deletion:
 * - Meet the Board photo deletion (active vs unused, replacement, member deletion)
 * - User profile picture deletion (replacement, removal, account deletion)
 * - URL and R2 key normalization and security checks
 * - Batch cleanup of orphaned images
 *
 * Usage:
 *   node server/scripts/testCloudStorageImageDeletion.js
 */
const assert = require('assert');
const path = require('path');
const {
  r2KeyFromUrlOrKey,
  deleteUnusedBoardPhoto,
  deleteUnusedProfilePicture,
  cleanupAllUnusedImages
} = require('../services/cloudStorageCleanup');
const cloudConfig = require('../config/cloud');
const { Board, User } = require('../models');

// Configure test environment variables
process.env.R2_PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN || 'https://cdn.example.com';
process.env.R2_BUCKET = process.env.R2_BUCKET || 'test-bucket';

let testsPassed = 0;
let testsFailed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  PASSED: ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`  FAILED: ${name}`);
    console.error(`    ${err.message}`);
    testsFailed++;
  }
}

async function runAsyncTest(name, fn) {
  try {
    await fn();
    console.log(`  PASSED: ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`  FAILED: ${name}`);
    console.error(`    ${err.message}`);
    testsFailed++;
  }
}

async function main() {
  console.log('\n======================================================');
  console.log(' Running Cloud Storage Image Deletion Tests');
  console.log('======================================================\n');

  // --- 1. Test Key Normalization & Extraction ---
  console.log('--- Suite 1: R2 Key Extraction & Validation ---');

  runTest('Extracts Board_Photos key from full public URL', () => {
    const url = 'https://cdn.example.com/Board_Photos/board_10_1710000_abc.png';
    const key = r2KeyFromUrlOrKey(url, ['Board_Photos/']);
    assert.strictEqual(key, 'Board_Photos/board_10_1710000_abc.png');
  });

  runTest('Strips query strings and hash anchors from URL', () => {
    const url = 'https://cdn.example.com/Board_Photos/board_10_1710000_abc.png?t=123456#main';
    const key = r2KeyFromUrlOrKey(url, ['Board_Photos/']);
    assert.strictEqual(key, 'Board_Photos/board_10_1710000_abc.png');
  });

  runTest('Extracts Profile_Pictures key from full URL', () => {
    const url = 'https://cdn.example.com/Profile_Pictures/211000_1710000_xyz.jpg';
    const key = r2KeyFromUrlOrKey(url, ['Profile_Pictures/']);
    assert.strictEqual(key, 'Profile_Pictures/211000_1710000_xyz.jpg');
  });

  runTest('Handles bare filename for profile pictures by prefixing directory', () => {
    const filename = '211000_1710000_xyz.jpg';
    const key = r2KeyFromUrlOrKey(filename, ['Profile_Pictures/']);
    assert.strictEqual(key, 'Profile_Pictures/211000_1710000_xyz.jpg');
  });

  runTest('Rejects external avatars / third-party URLs', () => {
    const url = 'https://ui-avatars.com/api/?name=John+Doe&background=random';
    const key = r2KeyFromUrlOrKey(url, ['Profile_Pictures/']);
    assert.strictEqual(key, null);
  });

  runTest('Rejects path traversal attempts', () => {
    const url = 'https://cdn.example.com/Board_Photos/../../etc/passwd';
    const key = r2KeyFromUrlOrKey(url, ['Board_Photos/']);
    // Either null or sanitized without ../
    if (key) {
      assert(!key.includes('..'));
    }
  });

  runTest('Rejects non-matching prefixes', () => {
    const url = 'https://cdn.example.com/Student_Schedules/doc.pdf';
    const key = r2KeyFromUrlOrKey(url, ['Board_Photos/', 'Profile_Pictures/']);
    assert.strictEqual(key, null);
  });

  // --- 2. Test Meet the Board Photo Deletion Safeguards ---
  console.log('\n--- Suite 2: Meet the Board Photo Deletion Logic ---');

  // Mock S3 delete command sending
  const deletedR2Keys = [];
  const originalR2Send = cloudConfig.r2.send;
  cloudConfig.r2.send = async (command) => {
    if (command?.input?.Key) {
      deletedR2Keys.push(command.input.Key);
    }
    if (command?.input?.Delete?.Objects) {
      for (const obj of command.input.Delete.Objects) {
        deletedR2Keys.push(obj.Key);
      }
    }
    return {};
  };

  await runAsyncTest('Non-R2 photo URL is ignored safely', async () => {
    deletedR2Keys.length = 0;
    const res = await deleteUnusedBoardPhoto('https://ui-avatars.com/avatar.png');
    assert.strictEqual(res.deleted, false);
    assert.strictEqual(res.reason, 'not_r2_photo');
    assert.strictEqual(deletedR2Keys.length, 0);
  });

  await runAsyncTest('Board photo is NOT deleted if still in use by another member', async () => {
    deletedR2Keys.length = 0;
    const testKey = 'Board_Photos/shared_portrait_1.png';
    const originalCount = Board.count;
    try {
      // Simulate another member sharing this photo
      Board.count = async () => 1;
      const res = await deleteUnusedBoardPhoto(testKey, { excludeBoardId: 5 });
      assert.strictEqual(res.deleted, false);
      assert.strictEqual(res.reason, 'still_in_use');
      assert.strictEqual(deletedR2Keys.length, 0);
    } finally {
      Board.count = originalCount;
    }
  });

  await runAsyncTest('Board photo IS deleted from R2 when not used by any other member', async () => {
    deletedR2Keys.length = 0;
    const testKey = 'Board_Photos/old_board_member_photo.png';
    const originalCount = Board.count;
    try {
      // Simulate no other member using this photo
      Board.count = async () => 0;
      const res = await deleteUnusedBoardPhoto(testKey, { excludeBoardId: 5 });
      assert.strictEqual(res.deleted, true);
      assert.strictEqual(res.key, testKey);
      assert.strictEqual(deletedR2Keys.includes(testKey), true);
    } finally {
      Board.count = originalCount;
    }
  });

  // --- 3. Test Profile Picture Deletion Safeguards ---
  console.log('\n--- Suite 3: User Profile Picture Deletion Logic ---');

  await runAsyncTest('Non-R2 profile picture is ignored safely', async () => {
    deletedR2Keys.length = 0;
    const res = await deleteUnusedProfilePicture('https://lh3.googleusercontent.com/a/photo.jpg');
    assert.strictEqual(res.deleted, false);
    assert.strictEqual(res.reason, 'not_r2_photo');
    assert.strictEqual(deletedR2Keys.length, 0);
  });

  await runAsyncTest('Profile picture is NOT deleted if still in use by another user', async () => {
    deletedR2Keys.length = 0;
    const testKey = 'Profile_Pictures/shared_avatar.png';
    const originalCount = User.count;
    try {
      User.count = async () => 2;
      const res = await deleteUnusedProfilePicture(testKey, { excludeUserId: 10 });
      assert.strictEqual(res.deleted, false);
      assert.strictEqual(res.reason, 'still_in_use');
      assert.strictEqual(deletedR2Keys.length, 0);
    } finally {
      User.count = originalCount;
    }
  });

  await runAsyncTest('Profile picture IS deleted from R2 when replaced by user', async () => {
    deletedR2Keys.length = 0;
    const testKey = 'Profile_Pictures/old_user_avatar_211000.png';
    const originalCount = User.count;
    try {
      User.count = async () => 0;
      const res = await deleteUnusedProfilePicture(testKey, { excludeUserId: 10 });
      assert.strictEqual(res.deleted, true);
      assert.strictEqual(res.key, testKey);
      assert.strictEqual(deletedR2Keys.includes(testKey), true);
    } finally {
      User.count = originalCount;
    }
  });

  // --- 4. Test Cleanup of Unused Storage Images ---
  console.log('\n--- Suite 4: Bucket-Wide Unused Images Cleanup ---');

  await runAsyncTest('cleanupAllUnusedImages detects orphaned photos and deletes them', async () => {
    deletedR2Keys.length = 0;
    const originalBoardFindAll = Board.findAll;
    const originalUserFindAll = User.findAll;
    const originalR2SendInternal = cloudConfig.r2.send;

    try {
      // Mock DB: Active board member uses active_board.png, active user uses active_user.png
      Board.findAll = async () => [
        { board_id: 1, photo_url: 'https://cdn.example.com/Board_Photos/active_board.png' }
      ];
      User.findAll = async () => [
        { user_id: 1, profile_picture: 'https://cdn.example.com/Profile_Pictures/active_user.png' }
      ];

      // Mock R2: Storage contains active AND orphaned photos
      cloudConfig.r2.send = async (cmd) => {
        // List command
        if (cmd.input?.Prefix === 'Board_Photos/') {
          return {
            Contents: [
              { Key: 'Board_Photos/active_board.png', Size: 1024, LastModified: new Date(Date.now() - 3600000) },
              { Key: 'Board_Photos/orphaned_board_1.png', Size: 2048, LastModified: new Date(Date.now() - 3600000) },
              { Key: 'Board_Photos/orphaned_board_2.png', Size: 3072, LastModified: new Date(Date.now() - 3600000) }
            ],
            IsTruncated: false
          };
        }
        if (cmd.input?.Prefix === 'Profile_Pictures/') {
          return {
            Contents: [
              { Key: 'Profile_Pictures/active_user.png', Size: 1024, LastModified: new Date(Date.now() - 3600000) },
              { Key: 'Profile_Pictures/orphaned_user_1.png', Size: 2048, LastModified: new Date(Date.now() - 3600000) }
            ],
            IsTruncated: false
          };
        }
        if (cmd.input?.Prefix === 'Images/board_') {
          return { Contents: [], IsTruncated: false };
        }
        // Delete command
        if (cmd.input?.Delete?.Objects) {
          for (const o of cmd.input.Delete.Objects) {
            deletedR2Keys.push(o.Key);
          }
        }
        if (cmd.input?.Key) {
          deletedR2Keys.push(cmd.input.Key);
        }
        return {};
      };

      // Test Dry Run mode first
      const dryReport = await cleanupAllUnusedImages({ dryRun: true, force: true });
      assert.strictEqual(dryReport.summary.totalUnused, 3);
      assert.strictEqual(dryReport.summary.totalDeleted, 0);
      assert.strictEqual(dryReport.deleted.boardPhotos.length, 2);
      assert.strictEqual(dryReport.deleted.profilePictures.length, 1);
      assert.strictEqual(deletedR2Keys.length, 0); // Nothing deleted in dry run

      // Test Live Apply mode
      const liveReport = await cleanupAllUnusedImages({ dryRun: false, force: true });
      assert.strictEqual(liveReport.summary.totalDeleted, 3);
      assert.strictEqual(liveReport.summary.boardPhotosDeleted, 2);
      assert.strictEqual(liveReport.summary.profilePicturesDeleted, 1);
      assert(deletedR2Keys.includes('Board_Photos/orphaned_board_1.png'));
      assert(deletedR2Keys.includes('Board_Photos/orphaned_board_2.png'));
      assert(deletedR2Keys.includes('Profile_Pictures/orphaned_user_1.png'));
      // Ensure ACTIVE photos were NOT deleted!
      assert(!deletedR2Keys.includes('Board_Photos/active_board.png'));
      assert(!deletedR2Keys.includes('Profile_Pictures/active_user.png'));
    } finally {
      Board.findAll = originalBoardFindAll;
      User.findAll = originalUserFindAll;
      cloudConfig.r2.send = originalR2SendInternal;
    }
  });

  // Restore original r2.send
  cloudConfig.r2.send = originalR2Send;

  console.log('\n======================================================');
  console.log(` Test Summary: ${testsPassed} passed, ${testsFailed} failed`);
  console.log('======================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
