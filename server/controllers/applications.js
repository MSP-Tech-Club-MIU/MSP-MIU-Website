const { Op } = require('sequelize');
const { Application } = require('../models');
const { parsePagination, paginationMeta } = require('../utils/pagination');
const { resolveSeasonFilter, seasonInclude, resolveSeasonIdForWrite } = require('../utils/seasonFilter');
const { enrollFromApplication } = require('../utils/memberEnrollment');
const { checkBlacklist } = require('../utils/blacklistCheck');
const { logAdminAction } = require('../utils/adminNotification');
const logger = require('../utils/logger');

function buildFieldCounts(rows, field) {
    const counts = {};
    for (const row of rows) {
        let value = row[field];
        if (value === null || value === undefined || value === '') value = 'N/A';
        const key = String(value);
        counts[key] = (counts[key] || 0) + 1;
    }
    return Object.entries(counts)
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count);
}

// Submit new application
const createApplication = async (req, res) => {
    try {
        const {
            university_id,
            full_name,
            email,
            faculty,
            year,
            phone_number,
            first_choice,
            second_choice,
            skills,
            motivation,
            interview
        } = req.body;

        // Validation
        if (!university_id || !full_name || !email || !faculty || !year || !phone_number || 
            !first_choice || !skills || !motivation || !interview) {
            return res.status(400).json({ 
                success: false,
                error: 'All required fields must be provided' 
            });
        }

        // Check if applicant is blacklisted
        const blacklistStatus = await checkBlacklist({
            name: full_name,
            university_id,
            phone_number,
            email
        });

        if (blacklistStatus.isBlacklisted) {
            return res.status(403).json({
                success: false,
                error: `Application rejected: You are restricted from participating in club activities. Reason: ${blacklistStatus.reason}`
            });
        }

        // Validate university_id format (e.g., 2024/12345 or numbers)
        const idRegex = /^[0-9/]+$/;
        if (!idRegex.test(university_id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid university ID format'
            });
        }

        // Validate email format
        const emailRegex = /^[^s@]+@[^s@]+.[^s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email format'
            });
        }

        // Validate phone number format (Egyptian numbers)
        const phoneRegex = /^01[0125][0-9]{8}$/;
        if (!phoneRegex.test(phone_number)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid phone number format. Must be a valid Egyptian number (e.g., 01012345678)'
            });
        }

        const season_id = await resolveSeasonIdForWrite(req.body, req.query);

        // Check if applicant already applied with same university_id in the same season
        const existingApplication = await Application.findOne({
            where: { university_id, season_id }
        });

        if (existingApplication) {
            return res.status(400).json({
                success: false,
                error: 'An application with this university ID already exists for this season'
            });
        }

        // Create application
        const application = await Application.create({
            university_id,
            full_name,
            email,
            faculty,
            year,
            phone_number,
            first_choice,
            second_choice: second_choice || null,
            skills,
            motivation,
            interview,
            status: 'pending',
            season_id
        });

        res.status(201).json({
            success: true,
            message: 'Application submitted successfully',
            data: application
        });

    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ success: false, error: error.message });
        }
        logger.error('Error creating application:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Get all applications (Board only)
const getAllApplications = async (req, res) => {
    try {
        const { 
            status, 
            faculty, 
            year, 
            first_choice, 
            second_choice,
            interview,
            search,
            view
        } = req.query;

        const { page, limit, offset } = parsePagination(req.query);
        const seasonFilter = await resolveSeasonFilter(req.query);
        const whereClause = { ...seasonFilter.where };

        if (status) whereClause.status = status;
        if (faculty) whereClause.faculty = faculty;
        if (year) whereClause.year = year;
        if (first_choice) whereClause.first_choice = first_choice;
        if (second_choice) whereClause.second_choice = second_choice;
        if (interview) whereClause.interview = interview;

        // Search functionality
        if (search) {
            whereClause[Op.or] = [
                { full_name: { [Op.like]: `%${search}%` } },
                { email: { [Op.like]: `%${search}%` } },
                { university_id: { [Op.like]: `%${search}%` } }
            ];
        }

        const include = [];
        if (seasonFilter.includeSeason) {
            include.push(seasonInclude());
        }

        if (view === 'summary') {
            const allRows = await Application.findAll({
                where: whereClause,
                include,
                attributes: ['status', 'faculty', 'year', 'first_choice', 'second_choice', 'interview']
            });

            return res.json({
                success: true,
                total: allRows.length,
                breakdown: {
                    status: buildFieldCounts(allRows, 'status'),
                    faculty: buildFieldCounts(allRows, 'faculty'),
                    year: buildFieldCounts(allRows, 'year'),
                    first_choice: buildFieldCounts(allRows, 'first_choice'),
                    second_choice: buildFieldCounts(allRows, 'second_choice'),
                    interview: buildFieldCounts(allRows, 'interview')
                }
            });
        }

        const { count, rows: applications } = await Application.findAndCountAll({
            where: whereClause,
            include,
            order: [['created_at', 'DESC']],
            limit,
            offset,
            distinct: true
        });

        // Get counts for dashboard
        const allFilteredRows = await Application.findAll({
            where: whereClause,
            attributes: ['status', 'faculty', 'year', 'first_choice', 'second_choice', 'interview']
        });

        const statusCounts = {};
        allFilteredRows.forEach(app => {
            statusCounts[app.status] = (statusCounts[app.status] || 0) + 1;
        });

        res.json({
            success: true,
            data: applications,
            pagination: paginationMeta({ page, limit, total: count }),
            stats: {
                total: count,
                pending: statusCounts['pending'] || 0,
                approved: statusCounts['approved'] || 0,
                rejected: statusCounts['rejected'] || 0
            }
        });

    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ success: false, error: error.message });
        }
        logger.error('Error fetching applications:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Update application status (approve/reject)
const updateApplicationStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!req.user || req.user.role !== 'board') {
            return res.status(403).json({
                success: false,
                error: 'Only board members can update application status'
            });
        }

        const application = await Application.findByPk(id);

        if (!application) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        await application.update({ status });

        let enrollment = null;
        if (status === 'approved') {
            // Upsert season member + move existing account to new department/season (no duplicate user)
            const departmentId =
                req.body.department_id != null && req.body.department_id !== ''
                    ? Number(req.body.department_id)
                    : application.first_choice;
            enrollment = await enrollFromApplication(application, { departmentId });
        }

        await logAdminAction(
            'application_status_updated',
            `Updated application #${id} status for "${application.full_name}" to "${status}"`,
            req,
            'application',
            id,
            application.season_id
        );

        res.json({
            success: true,
            message: `Application ${status} successfully`,
            data: {
                application_id: id,
                status,
                ...(enrollment
                    ? {
                          member_id: enrollment.member.member_id,
                          department_id: enrollment.member.department_id,
                          season_id: enrollment.member.season_id,
                          user_id: enrollment.user?.user_id || enrollment.member.user_id || null,
                          created_member: enrollment.createdMember,
                          updated_existing_account: enrollment.updatedUser
                      }
                    : {})
            }
        });

    } catch (error) {
        logger.error('Error updating application status:', error);
        const sqlMessage = error.parent?.sqlMessage || error.original?.sqlMessage;
        const dup =
            error.name === 'SequelizeUniqueConstraintError' ||
            /Duplicate entry/i.test(String(sqlMessage || ''));
        if (dup) {
            return res.status(409).json({
                success: false,
                error:
                    'Could not enroll member for this season. The database may still have a global unique index on university ID. ' +
                    'Run: npm run patch:members-multi-season — then try again.'
            });
        }
        res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
};

// Update application comment
const updateApplicationComment = async (req, res) => {
    try {
        const { id } = req.params;
        const { comment } = req.body;

        const application = await Application.findByPk(id);

        if (!application) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        await application.update({ comment });

        await logAdminAction(
            'application_comment_updated',
            `Updated interview comment for applicant "${application.full_name}"`,
            req,
            'application',
            id,
            application.season_id
        );

        res.json({
            success: true,
            message: 'Comment updated successfully',
            data: { application_id: id, comment }
        });

    } catch (error) {
        logger.error('Error updating application comment:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

// Delete application
const deleteApplication = async (req, res) => {
    try {
        const { id } = req.params;

        const application = await Application.findByPk(id);

        if (!application) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        const appName = application.full_name;
        const appUniId = application.university_id;
        const seasonId = application.season_id;

        await application.destroy();

        await logAdminAction(
            'application_deleted',
            `Deleted application of "${appName}" (${appUniId})`,
            req,
            'application',
            id,
            seasonId
        );

        res.json({
            success: true,
            message: 'Application deleted successfully'
        });
    } catch (error) {
        logger.error('Error deleting application:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

module.exports = {
    createApplication,
    getAllApplications,
    updateApplicationStatus,
    updateApplicationComment,
    deleteApplication
};
