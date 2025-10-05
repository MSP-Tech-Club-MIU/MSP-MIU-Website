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
        const applications = await Application.findAll({
            order: [['application_id', 'DESC']]
        });

        res.json({
            success: true,
            data: applications,
            count: applications.length
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
    deleteApplication
};