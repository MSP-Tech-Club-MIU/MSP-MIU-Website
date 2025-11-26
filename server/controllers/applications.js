const { Application } = require('../models');

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

        // Check if university_id already exists
        const existing = await Application.findOne({
            where: { university_id }
        });

        if (existing) {
            return res.status(409).json({
                success: false,
                error: 'Application with this university ID already exists'
            });
        }

        // Create new application
        const application = await Application.create({
            university_id,
            full_name,
            email,
            faculty,
            year,
            phone_number,
            first_choice,
            second_choice: second_choice || null, // Allow null for second_choice
            skills,
            motivation,
            interview
        });

        res.status(201).json({
            success: true,
            message: 'Application submitted successfully',
            data: {
                application_id: application.application_id,
                university_id: application.university_id,
                status: application.status
            }
        });

    } catch (error) {
        console.error('Error submitting application:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
            code: error.code,
            errno: error.errno,
            sqlState: error.sqlState
        });
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};


const getAllApplications = async (req, res) => {
    try {
        // Extract query parameters for filtering
        const { 
            first_choice, 
            second_choice, 
            status, 
            faculty, 
            year,
            search 
        } = req.query;

        // Build where clause for filtering
        const whereClause = {};
        
        if (first_choice) {
            whereClause.first_choice = parseInt(first_choice);
        }
        
        if (second_choice) {
            whereClause.second_choice = parseInt(second_choice);
        }
        
        if (status) {
            whereClause.status = status;
        }
        
        if (faculty) {
            whereClause.faculty = faculty;
        }
        
        if (year) {
            whereClause.year = parseInt(year);
        }

        // Build the query options
        const queryOptions = {
            where: whereClause,
            order: [['application_id', 'DESC']]
        };

        // Add text search if provided
        if (search) {
            const { Op } = require('sequelize');
            
            // Sanitize search input: trim, limit length, and escape special LIKE characters
            let sanitizedSearch = String(search).trim();
            
            // Limit search length to prevent DoS attacks
            if (sanitizedSearch.length > 100) {
                sanitizedSearch = sanitizedSearch.substring(0, 100);
            }
            
            // Escape special LIKE pattern characters (% and _) to prevent pattern injection
            // Replace % with \% and _ with \_ to treat them as literal characters
            // This prevents users from using SQL LIKE wildcards for injection attempts
            sanitizedSearch = sanitizedSearch.replace(/[%_\\]/g, (match) => {
                if (match === '\\') return '\\\\';
                return `\\${match}`;
            });
            
            // Sequelize automatically parameterizes queries, but we've sanitized the input
            // to prevent pattern-based attacks and ensure safe LIKE pattern matching
            queryOptions.where = {
                ...whereClause,
                [Op.or]: [
                    { university_id: { [Op.like]: `%${sanitizedSearch}%` } },
                    { full_name: { [Op.like]: `%${sanitizedSearch}%` } },
                    { email: { [Op.like]: `%${sanitizedSearch}%` } },
                    { phone_number: { [Op.like]: `%${sanitizedSearch}%` } },
                    { skills: { [Op.like]: `%${sanitizedSearch}%` } },
                    { motivation: { [Op.like]: `%${sanitizedSearch}%` } }
                    // Note: Comment field excluded from search
                ]
            };
        }

        const applications = await Application.findAll(queryOptions);

        res.json({
            success: true,
            data: applications,
            count: applications.length,
            filters: {
                first_choice,
                second_choice,
                status,
                faculty,
                year,
                search
            }
        });
    } catch (error) {
        console.error('Error fetching applications:', error);
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

        res.json({
            success: true,
            message: `Application ${status} successfully`,
            data: { application_id: id, status }
        });

    } catch (error) {
        console.error('Error updating application status:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
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

        res.json({
            success: true,
            message: 'Comment updated successfully',
            data: { application_id: id, comment }
        });

    } catch (error) {
        console.error('Error updating application comment:', error);
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

        await application.destroy();

        res.json({
            success: true,
            message: 'Application deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting application:', error);
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
