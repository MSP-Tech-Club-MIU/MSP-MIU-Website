require('dotenv').config();
const sequelize = require('../config/db');
const Application = require('../models/Application');
const Member = require('../models/Member');
const Department = require('../models/Department');

/**
 * Script to insert approved applications as new members into the database
 * This script:
 * 1. Finds all applications with status = 'approved'
 * 2. Checks if a member with the same university_id already exists
 * 3. Creates a new member record for each approved application that doesn't already exist
 * 4. Assigns each member to their first_choice department (uses application.first_choice as department_id)
 */
async function insertApprovedApplicationsAsMembers() {
  try {
    // Test database connection
    console.log('Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.\n');

    // Find all approved applications
    console.log('Fetching approved applications...');
    const approvedApplications = await Application.findAll({
      where: {
        status: 'approved'
      }
    });

    console.log(`Found ${approvedApplications.length} approved application(s).\n`);

    if (approvedApplications.length === 0) {
      console.log('No approved applications found. Exiting...');
      await sequelize.close();
      return;
    }

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    const errors = [];

    // Process each approved application
    for (const application of approvedApplications) {
      try {
        // Check if member already exists by university_id
        const existingMember = await Member.findOne({
          where: {
            university_id: application.university_id
          }
        });

        if (existingMember) {
          console.log(`⏭️  Skipping ${application.full_name} (${application.university_id}) - Member already exists`);
          skipCount++;
          continue;
        }

        // Validate that first_choice exists and is a valid department_id
        // Members will be assigned to their first_choice department
        if (!application.first_choice) {
          console.log(`⚠️  Skipping ${application.full_name} (${application.university_id}) - No first_choice department specified`);
          errors.push({
            application_id: application.application_id,
            university_id: application.university_id,
            full_name: application.full_name,
            error: 'No first_choice department specified'
          });
          errorCount++;
          continue;
        }

        // Verify that the first_choice department exists in the database
        const department = await Department.findByPk(application.first_choice);
        if (!department) {
          console.log(`⚠️  Skipping ${application.full_name} (${application.university_id}) - Invalid department_id: ${application.first_choice}`);
          errors.push({
            application_id: application.application_id,
            university_id: application.university_id,
            full_name: application.full_name,
            error: `Invalid department_id: ${application.first_choice}`
          });
          errorCount++;
          continue;
        }

        // Create new member record and assign to first_choice department
        // The member's department_id will be set to application.first_choice
        const newMember = await Member.create({
          university_id: application.university_id,
          full_name: application.full_name,
          email: application.email,
          faculty: application.faculty,
          year: application.year,
          phone_number: application.phone_number,
          department_id: application.first_choice, // Assigning member to first_choice department
          joined_at: new Date(),
          schedule: null, // Can be set later
          user_id: null   // Can be linked later if user account is created
        });

        console.log(`✅ Successfully created member: ${newMember.full_name} (${newMember.university_id}) - Department: ${department.name}`);
        successCount++;

      } catch (error) {
        console.error(`❌ Error processing application ${application.application_id} (${application.university_id}):`, error.message);
        errors.push({
          application_id: application.application_id,
          university_id: application.university_id,
          full_name: application.full_name,
          error: error.message
        });
        errorCount++;
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total approved applications: ${approvedApplications.length}`);
    console.log(`✅ Successfully created: ${successCount}`);
    console.log(`⏭️  Skipped (already exists): ${skipCount}`);
    console.log(`❌ Errors: ${errorCount}`);

    if (errors.length > 0) {
      console.log('\nErrors:');
      errors.forEach(err => {
        console.log(`  - ${err.full_name} (${err.university_id}): ${err.error}`);
      });
    }

    console.log('\n✅ Script completed successfully!');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    // Close database connection
    await sequelize.close();
    console.log('\nDatabase connection closed.');
  }
}

// Run the script
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
