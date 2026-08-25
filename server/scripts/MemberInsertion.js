require('dotenv').config();
const sequelize = require('../config/db');
const Application = require('../models/Application');
const Department = require('../models/Department');
const { enrollFromApplication } = require('../utils/memberEnrollment');

/**
 * Insert / refresh members from approved applications.
 * - Creates a season-scoped member row when missing
 * - Updates department + season for returning students
 * - Syncs the existing User account (no duplicate accounts)
 */
async function insertApprovedApplicationsAsMembers() {
  try {
    console.log('Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.\n');

    console.log('Fetching approved applications...');
    const approvedApplications = await Application.findAll({
      where: { status: 'approved' }
    });

    console.log(`Found ${approvedApplications.length} approved application(s).\n`);

    if (approvedApplications.length === 0) {
      console.log('No approved applications found. Exiting...');
      await sequelize.close();
      return;
    }

    let createdCount = 0;
    let updatedCount = 0;
    let syncedAccountCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const application of approvedApplications) {
      try {
        if (!application.first_choice) {
          console.log(
            `⚠️  Skipping ${application.full_name} (${application.university_id}) - No first_choice department`
          );
          errors.push({
            application_id: application.application_id,
            university_id: application.university_id,
            full_name: application.full_name,
            error: 'No first_choice department specified'
          });
          errorCount++;
          continue;
        }

        const department = await Department.findByPk(application.first_choice);
        if (!department) {
          console.log(
            `⚠️  Skipping ${application.full_name} (${application.university_id}) - Invalid department_id: ${application.first_choice}`
          );
          errors.push({
            application_id: application.application_id,
            university_id: application.university_id,
            full_name: application.full_name,
            error: `Invalid department_id: ${application.first_choice}`
          });
          errorCount++;
          continue;
        }

        const { member, user, createdMember, updatedUser } = await enrollFromApplication(
          application,
          { departmentId: application.first_choice }
        );

        if (createdMember) {
          createdCount++;
          console.log(
            `✅ Created member: ${member.full_name} (${member.university_id}) → ${department.name} [season ${member.season_id}]`
          );
        } else {
          updatedCount++;
          console.log(
            `🔄 Updated member: ${member.full_name} (${member.university_id}) → ${department.name} [season ${member.season_id}]`
          );
        }

        if (updatedUser) {
          syncedAccountCount++;
          console.log(
            `   ↳ Synced existing account user_id=${user.user_id} (dept=${user.department_id}, season=${user.season_id})`
          );
        }
      } catch (error) {
        console.error(
          `❌ Error processing application ${application.application_id} (${application.university_id}):`,
          error.message
        );
        errors.push({
          application_id: application.application_id,
          university_id: application.university_id,
          full_name: application.full_name,
          error: error.message
        });
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total approved applications: ${approvedApplications.length}`);
    console.log(`✅ Created members: ${createdCount}`);
    console.log(`🔄 Updated members: ${updatedCount}`);
    console.log(`👤 Synced existing accounts: ${syncedAccountCount}`);
    console.log(`❌ Errors: ${errorCount}`);

    if (errors.length > 0) {
      console.log('\nErrors:');
      errors.forEach((err) => {
        console.log(`  - ${err.full_name} (${err.university_id}): ${err.error}`);
      });
    }

    console.log('\n✅ Script completed successfully!');
  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    await sequelize.close();
    console.log('\nDatabase connection closed.');
  }
}

if (require.main === module) {
  insertApprovedApplicationsAsMembers()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = insertApprovedApplicationsAsMembers;
